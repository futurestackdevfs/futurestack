import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { Auth } from '../auth/decorators/auth.decorator';
import { CouponService } from './coupon.service';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';

@Controller('admin/coupons')
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Auth(Role.ADMIN)
  @Post()
  create(@Req() req: Request, @Body() dto: CreateCouponDto) {
    const user = req.user as { id: string };
    return this.couponService.create(user.id, dto);
  }

  @Auth(Role.ADMIN)
  @Get()
  list(@Query('page') page?: string, @Query('perPage') perPage?: string) {
    const p = page ? parseInt(page, 10) : 1;
    const pp = perPage ? parseInt(perPage, 10) : 20;
    return this.couponService.list(p, pp);
  }

  @Auth(Role.ADMIN)
  @Get(':id/sales')
  sales(@Param('id') id: string) {
    return this.couponService.listSales(id);
  }

  @Auth(Role.ADMIN)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.couponService.findOne(id);
  }

  @Auth(Role.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCouponDto) {
    return this.couponService.update(id, dto);
  }

  @Auth(Role.ADMIN)
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.couponService.deactivate(id);
  }

  @Auth(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.couponService.remove(id);
  }
}
