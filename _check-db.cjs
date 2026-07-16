const { PrismaClient } = require('./apps/api/node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const courses = await prisma.course.findMany({
    select: {
      id: true, title: true, code: true, status: true,
      sections: {
        select: {
          id: true, title: true,
          videos: { select: { id: true, title: true, durationSeconds: true } },
          quizzes: { select: { id: true, title: true, totalQuestions: true, passingScore: true } },
        }
      }
    }
  });
  console.log('=== COURSES ===');
  for (const c of courses) {
    const totalVids = c.sections.reduce((s, sec) => s + sec.videos.length, 0);
    const totalQuiz = c.sections.reduce((s, sec) => s + sec.quizzes.length, 0);
    console.log(c.id, c.title, '| status:', c.status, '| sections:', c.sections.length, '| videos:', totalVids, '| quizzes:', totalQuiz);
    for (const sec of c.sections) {
      console.log('  ', sec.title, '- videos:', sec.videos.length, 'quizzes:', sec.quizzes.length);
      for (const v of sec.videos) console.log('    [V]', v.id, v.title, v.durationSeconds + 's');
      for (const q of sec.quizzes) console.log('    [Q]', q.id, q.title, q.totalQuestions + 'q', 'pass:', q.passingScore);
    }
  }

  console.log('\n=== ENROLLMENTS ===');
  const enrollments = await prisma.enrollment.findMany({
    select: { studentId: true, courseId: true, status: true, enrolledAt: true }
  });
  for (const e of enrollments) {
    console.log('student:', e.studentId, 'course:', e.courseId, 'status:', e.status, 'enrolled:', e.enrolledAt);
  }

  console.log('\n=== VIDEO PROGRESS ===');
  const vp = await prisma.videoProgress.findMany({
    select: { studentId: true, videoId: true, uniqueSecsWatched: true, lastPositionSec: true, isCompleted: true, completedAt: true }
  });
  for (const p of vp) {
    console.log('student:', p.studentId, 'video:', p.videoId, 'watched:', p.uniqueSecsWatched + 's', 'completed:', p.isCompleted);
  }

  console.log('\n=== QUIZ ATTEMPTS ===');
  const qa = await prisma.quizAttempt.findMany({
    select: { studentId: true, quizId: true, score: true, isCompleted: true }
  });
  for (const a of qa) {
    console.log('student:', a.studentId, 'quiz:', a.quizId, 'score:', a.score, 'completed:', a.isCompleted);
  }

  console.log('\n=== CERTIFICATES ===');
  const certs = await prisma.certificate.findMany({
    select: { studentId: true, courseId: true, credentialId: true, score: true, rank: true, issuedAt: true }
  });
  for (const c of certs) {
    console.log('student:', c.studentId, 'course:', c.courseId, 'cred:', c.credentialId, 'score:', c.score, 'rank:', c.rank);
  }
  if (certs.length === 0) console.log('(none)');

  await prisma.$disconnect();
})();
