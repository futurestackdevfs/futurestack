import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { PrismaService } from '../prisma/prisma.service'
import * as bcrypt from 'bcrypt'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  // validate user during login - called by LocalStrategy
  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return user
  }

  // generate JWT token
  generateToken(user: { id: string; email: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role
    }
    return this.jwtService.sign(payload)
  }

  // student register
  async register(data: {
    name: string
    email: string
    password: string
  }) {
    // check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email }
    })

    if (existing) {
      throw new ConflictException('Email already in use')
    }

    // hash password
    const hashedPassword = await bcrypt.hash(data.password, 10)

    // create user
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashedPassword,
        role: 'STUDENT'
      }
    })

    // return token
    const token = this.generateToken(user)

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  }

  // login - works for all roles
  async login(user: any) {
    const token = this.generateToken(user)

    // update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  }

  // Google OAuth - find or create user
  async googleAuth(googleUser: {
    googleId: string
    email: string
    name: string
  }) {
    // check if user exists
    let user = await this.prisma.user.findUnique({
      where: { email: googleUser.email }
    })

    if (!user) {
      // create new student via Google
      user = await this.prisma.user.create({
        data: {
          name: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.googleId,
          role: 'STUDENT'
        }
      })
    }

    const token = this.generateToken(user)

    return {
      accessToken: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    }
  }
}