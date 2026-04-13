import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import type { LeaderboardEntry, UserProfile, UserStats } from '@online-games/shared';
import { UserEntity, UserRole } from './entities/user.entity';
import { GameScoreEntity } from './entities/game-score.entity';
import { HeadToHeadEntity } from './entities/head-to-head.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepo: Repository<UserEntity>,
    @InjectRepository(GameScoreEntity)
    private readonly scoresRepo: Repository<GameScoreEntity>,
    @InjectRepository(HeadToHeadEntity)
    private readonly h2hRepo: Repository<HeadToHeadEntity>,
  ) {}

  async create(data: {
    username: string;
    email: string | null;
    passwordHash: string | null;
    isAnonymous?: boolean;
    emailVerificationToken?: string | null;
    isEmailVerified?: boolean;
    role?: UserRole;
    isBlocked?: boolean;
  }): Promise<UserEntity> {
    const user = this.usersRepo.create({
      username: data.username,
      email: data.email,
      passwordHash: data.passwordHash,
      isAnonymous: data.isAnonymous ?? false,
      emailVerificationToken: data.emailVerificationToken ?? null,
      isEmailVerified: data.isEmailVerified ?? false,
      role: data.role ?? UserRole.USER,
      isBlocked: data.isBlocked ?? false,
    });
    try {
      return await this.usersRepo.save(user);
    } catch (e: unknown) {
      if (this.isUniqueViolation(e)) {
        throw new ConflictException('Username or email already in use');
      }
      throw e;
    }
  }

  async countTotal(): Promise<number> {
    return this.usersRepo.count();
  }

  async countBlocked(): Promise<number> {
    return this.usersRepo.count({ where: { isBlocked: true } });
  }

  async countAdmins(): Promise<number> {
    return this.usersRepo.count({ where: { role: UserRole.ADMIN } });
  }

  async findById(id: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { id } });
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  async findByUsername(username: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({ where: { username } });
  }

  async findByVerificationToken(token: string): Promise<UserEntity | null> {
    return this.usersRepo.findOne({
      where: { emailVerificationToken: token },
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.usersRepo.update(userId, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });
  }

  async updateAvatar(userId: string, avatarUrl: string | null): Promise<UserEntity> {
    await this.usersRepo.update(userId, { avatarUrl });
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  toProfile(user: UserEntity, stats?: UserStats): UserProfile {
    return {
      id: user.id,
      username: user.username,
      email: user.email ?? undefined,
      isAnonymous: user.isAnonymous,
      avatarUrl: user.avatarUrl ?? undefined,
      createdAt: user.createdAt.toISOString(),
      role: user.role,
      isBlocked: user.isBlocked,
      stats: stats ?? this.emptyStats(),
    };
  }

  async findAll(options: {
    page: number;
    limit: number;
    search?: string;
    role?: UserRole;
  }): Promise<{ items: UserEntity[]; total: number }> {
    const qb = this.usersRepo.createQueryBuilder('u');
    if (options.search?.trim()) {
      const s = `%${options.search.trim()}%`;
      qb.andWhere('(u.username ILIKE :s OR u.email ILIKE :s)', { s });
    }
    if (options.role) {
      qb.andWhere('u.role = :role', { role: options.role });
    }
    const total = await qb.getCount();
    qb.orderBy('u.createdAt', 'DESC')
      .skip((options.page - 1) * options.limit)
      .take(options.limit);
    const items = await qb.getMany();
    return { items, total };
  }

  async blockUser(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(id, { isBlocked: true });
    const next = await this.findById(id);
    return next!;
  }

  async unblockUser(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(id, { isBlocked: false });
    const next = await this.findById(id);
    return next!;
  }

  async activateUser(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(id, {
      isEmailVerified: true,
      emailVerificationToken: null,
    });
    const next = await this.findById(id);
    return next!;
  }

  async updateRole(id: string, role: UserRole): Promise<UserEntity> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.update(id, { role });
    const next = await this.findById(id);
    return next!;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) throw new NotFoundException('User not found');
    await this.usersRepo.delete(id);
  }

  async findOrCreateAdmin(
    username: string,
    plainPassword: string,
    email: string | null = null,
  ): Promise<UserEntity> {
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    const existing = await this.findByUsername(username);
    if (existing) {
      const update: Partial<UserEntity> = {
        passwordHash,
        role: UserRole.ADMIN,
        isEmailVerified: true,
        isBlocked: false,
      };
      if (email) update.email = email;
      await this.usersRepo.update(existing.id, update);
      const next = await this.findById(existing.id);
      return next!;
    }
    return this.create({
      username,
      email,
      passwordHash,
      isEmailVerified: true,
      emailVerificationToken: null,
      role: UserRole.ADMIN,
    });
  }

  emptyStats(): UserStats {
    return {
      gamesPlayed: 0,
      gamesWon: 0,
      totalPoints: 0,
      gameStats: {},
    };
  }

  async getStatsForUser(userId: string): Promise<UserStats> {
    const user = await this.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    return this.buildStats(userId);
  }

  async buildStats(userId: string): Promise<UserStats> {
    const rows = await this.scoresRepo.find({ where: { userId } });
    const gameStats: UserStats['gameStats'] = {};
    let gamesPlayed = 0;
    let gamesWon = 0;
    let totalPoints = 0;

    for (const r of rows) {
      gamesPlayed += 1;
      if (r.won) gamesWon += 1;
      totalPoints += r.points;
      const g = r.gameType;
      if (!gameStats[g]) {
        gameStats[g] = {
          gamesPlayed: 0,
          gamesWon: 0,
          totalPoints: 0,
          highestScore: 0,
          winRate: 0,
        };
      }
      const gs = gameStats[g];
      gs.gamesPlayed += 1;
      if (r.won) gs.gamesWon += 1;
      gs.totalPoints += r.points;
      gs.highestScore = Math.max(gs.highestScore, r.points);
    }

    for (const g of Object.keys(gameStats)) {
      const gs = gameStats[g];
      gs.winRate = gs.gamesPlayed ? gs.gamesWon / gs.gamesPlayed : 0;
    }

    return {
      gamesPlayed,
      gamesWon,
      totalPoints,
      gameStats,
    };
  }

  async getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    const qb = this.scoresRepo
      .createQueryBuilder('s')
      .select('s.user_id', 'userId')
      .addSelect('COUNT(*)', 'gamesPlayed')
      .addSelect('SUM(CASE WHEN s.won THEN 1 ELSE 0 END)', 'gamesWon')
      .addSelect('SUM(s.points)', 'totalPoints')
      .groupBy('s.user_id')
      .orderBy('SUM(s.points)', 'DESC')
      .limit(limit);

    const raw = await qb.getRawMany<{
      userId: string;
      gamesPlayed: string;
      gamesWon: string;
      totalPoints: string;
    }>();

    const entries: LeaderboardEntry[] = [];
    let rank = 1;
    for (const row of raw) {
      const user = await this.findById(row.userId);
      if (!user || user.isAnonymous) continue;
      const gamesPlayed = parseInt(row.gamesPlayed, 10);
      const gamesWon = parseInt(row.gamesWon, 10);
      entries.push({
        rank: rank++,
        userId: row.userId,
        username: user.username,
        avatarUrl: user.avatarUrl ?? undefined,
        totalPoints: parseFloat(row.totalPoints),
        gamesWon,
        gamesPlayed,
        winRate: gamesPlayed ? gamesWon / gamesPlayed : 0,
      });
    }
    return entries;
  }

  async recordGameScore(input: {
    userId: string;
    gameType: string;
    points: number;
    won: boolean;
    gameId: string;
  }): Promise<GameScoreEntity> {
    const row = this.scoresRepo.create({
      userId: input.userId,
      gameType: input.gameType,
      points: input.points,
      won: input.won,
      gameId: input.gameId,
    });
    return this.scoresRepo.save(row);
  }

  async deleteStaleGuests(maxAgeMs: number): Promise<number> {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await this.usersRepo
      .createQueryBuilder()
      .delete()
      .from(UserEntity)
      .where('is_anonymous = true')
      .andWhere('updated_at < :cutoff', { cutoff })
      .execute();
    return result.affected ?? 0;
  }

  async recordHeadToHead(
    winnerId: string,
    loserId: string,
    gameType: string,
  ): Promise<void> {
    await this.upsertH2H(winnerId, loserId, gameType, 'wins');
    await this.upsertH2H(loserId, winnerId, gameType, 'losses');
  }

  async getHeadToHead(userId: string): Promise<HeadToHeadEntity[]> {
    return this.h2hRepo.find({
      where: { userId },
      relations: ['opponent'],
    });
  }

  private async upsertH2H(
    userId: string,
    opponentId: string,
    gameType: string,
    field: 'wins' | 'losses',
  ): Promise<void> {
    let record = await this.h2hRepo.findOne({
      where: { userId, opponentId, gameType },
    });
    if (!record) {
      record = this.h2hRepo.create({
        userId,
        opponentId,
        gameType,
        wins: 0,
        losses: 0,
      });
    }
    record[field] += 1;
    await this.h2hRepo.save(record);
  }

  generateVerificationToken(): string {
    return uuidv4();
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code?: string }).code === '23505'
    );
  }
}
