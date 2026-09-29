import { Global, Module } from '@nestjs/common';
import { AiProviderService } from './ai-provider.service';

/**
 * Global home for AI provider access. Any feature module that needs a model
 * call — blog article generation today, something else tomorrow — injects
 * {@link AiProviderService} directly instead of redeclaring it; the API key
 * and Anthropic client are created exactly once for the whole process.
 */
@Global()
@Module({
  providers: [AiProviderService],
  exports: [AiProviderService],
})
export class AiModule {}
