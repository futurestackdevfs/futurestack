import { CourseStatus, SkillLevel } from '@prisma/client';

export class UpdateProjectDto {
  name?: string;
  image?: string;
  techLabel?: string;
  tech?: string;
  category?: string;
  level?: SkillLevel;
  badge?: string;
  shortDesc?: string;
  overview?: string;
  stack?: string[];
  highlights?: string[];
  prereqs?: string[];
  includes?: string[];
  industryUse?: string;
  tools?: string[];
  setupSteps?: string[];
  duration?: string;
  sessions?: string;
  seats?: number;
  price?: number;
  originalPrice?: number;
  rating?: number;
  reviewCount?: number;
  status?: CourseStatus;
  trainerId?: string;
  thumbGradient?: string;
  demoVideoUrl?: string;
  walkthroughVideoUrl?: string;
}
