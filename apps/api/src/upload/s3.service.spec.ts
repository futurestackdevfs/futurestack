import { ConfigService } from '@nestjs/config';
import { S3Service } from './s3.service';

// No network is ever touched: the S3 client is constructed but never used, and
// `delete` is spied on wherever deleteByUrl is exercised.
function makeService(env: Record<string, string | undefined>) {
  const config = { get: (k: string) => env[k] } as unknown as ConfigService;
  const service = new S3Service(config);
  service.onModuleInit();
  return service;
}

const BASE_ENV = {
  AWS_REGION: 'ap-south-1',
  AWS_ACCESS_KEY_ID: '__spec__key',
  AWS_SECRET_ACCESS_KEY: '__spec__secret',
  S3_BUCKET: 'spec-bucket',
};
const HOST = 'https://spec-bucket.s3.ap-south-1.amazonaws.com';

describe('S3Service.resolveOwnKey() / deleteByUrl() — only our own storage is addressable', () => {
  let service: S3Service;

  beforeEach(() => {
    service = makeService(BASE_ENV);
  });

  it('resolves a URL we issued to its key', () => {
    expect(service.resolveOwnKey(`${HOST}/courses/123-456.jpg`)).toBe('courses/123-456.jpg');
    expect(service.resolveOwnKey(`${HOST}/discussions/1-2.png`, ['discussions'])).toBe(
      'discussions/1-2.png',
    );
  });

  it('refuses a URL on a different host, whatever its path looks like', () => {
    expect(service.resolveOwnKey('https://evil.example/courses/123-456.jpg')).toBeNull();
    expect(service.resolveOwnKey('http://spec-bucket.s3.ap-south-1.amazonaws.com.evil.example/courses/a.jpg')).toBeNull();
    expect(service.resolveOwnKey('http://spec-bucket.s3.ap-south-1.amazonaws.com/courses/a.jpg')).toBeNull(); // http, not https
  });

  it('refuses URLs carrying credentials in the authority', () => {
    expect(service.resolveOwnKey('https://user:pw@spec-bucket.s3.ap-south-1.amazonaws.com/courses/a.jpg')).toBeNull();
  });

  it('refuses keys outside the allowed folders', () => {
    expect(service.resolveOwnKey(`${HOST}/courses/a.jpg`, ['discussions'])).toBeNull();
    expect(service.resolveOwnKey(`${HOST}/not-a-folder/a.jpg`)).toBeNull();
    expect(service.resolveOwnKey(`${HOST}/a.jpg`)).toBeNull(); // no folder at all
    expect(service.resolveOwnKey(`${HOST}/`)).toBeNull();
  });

  it.each([
    `${HOST}/discussions/../courses/a.jpg`,
    `${HOST}/discussions/%2e%2e/courses/a.jpg`,
    `${HOST}/discussions%2F..%2Fcourses%2Fa.jpg`,
    `${HOST}/discussions//a.jpg`,
    `${HOST}/discussions/a%00.jpg`,
    `${HOST}/discussions/a%5Cb.jpg`,
  ])('cannot be steered out of the discussions/ folder: %s', (url) => {
    expect(service.resolveOwnKey(url, ['discussions'])).toBeNull();
  });

  it('refuses malformed input and empty values', () => {
    expect(service.resolveOwnKey('')).toBeNull();
    expect(service.resolveOwnKey('not a url')).toBeNull();
    expect(service.resolveOwnKey(`${HOST}/discussions/%E0%A4%A.png`)).toBeNull(); // bad percent-encoding
  });

  it('honours a public URL that carries a path prefix (e.g. Supabase storage)', () => {
    const supa = makeService({
      ...BASE_ENV,
      S3_ENDPOINT: 'https://spec.supabase.co/storage/v1/s3',
      S3_PUBLIC_URL: 'https://spec.supabase.co/storage/v1/object/public/spec-bucket',
    });
    const own = 'https://spec.supabase.co/storage/v1/object/public/spec-bucket';
    expect(supa.resolveOwnKey(`${own}/discussions/a.png`, ['discussions'])).toBe('discussions/a.png');
    // same host, but another bucket / path: not ours
    expect(
      supa.resolveOwnKey('https://spec.supabase.co/storage/v1/object/public/other-bucket/discussions/a.png', ['discussions']),
    ).toBeNull();
    expect(supa.resolveOwnKey('https://spec.supabase.co/discussions/a.png', ['discussions'])).toBeNull();
  });

  it('resolves nothing when S3 is not configured', () => {
    const unconfigured = makeService({});
    expect(unconfigured.resolveOwnKey(`${HOST}/courses/a.jpg`)).toBeNull();
    expect(unconfigured.isOwnUrl(`${HOST}/courses/a.jpg`)).toBe(false);
  });

  describe('deleteByUrl()', () => {
    it('deletes the object for a URL we issued', async () => {
      const del = jest.spyOn(service, 'delete').mockResolvedValue();
      await service.deleteByUrl(`${HOST}/discussions/1-2.png`, ['discussions']);
      expect(del).toHaveBeenCalledWith('discussions/1-2.png');
    });

    it('never deletes for a foreign host, even if the path names a real object', async () => {
      const del = jest.spyOn(service, 'delete').mockResolvedValue();
      await service.deleteByUrl('https://example.com/courses/victim-thumbnail.jpg', ['discussions']);
      await service.deleteByUrl('https://example.com/courses/victim-thumbnail.jpg');
      expect(del).not.toHaveBeenCalled();
    });

    it('never deletes an object in a folder the caller did not allow', async () => {
      const del = jest.spyOn(service, 'delete').mockResolvedValue();
      await service.deleteByUrl(`${HOST}/courses/victim-thumbnail.jpg`, ['discussions']);
      expect(del).not.toHaveBeenCalled();
    });
  });
});
