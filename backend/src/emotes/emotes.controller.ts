import { BadRequestException, Body, Controller, Get, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { CreateEmoteDto } from './dto/create-emote.dto';
import { EmoteResponseDto } from './dto/emote-response.dto';
import { EmotesService } from './emotes.service';

@ApiTags('emotes')
@Controller('emotes')
export class EmotesController {
  constructor(private readonly emotesService: EmotesService) {}

  @Get()
  @ApiOkResponse({ type: [EmoteResponseDto] })
  async list(): Promise<EmoteResponseDto[]> {
    const rows = await this.emotesService.listAll();
    return rows.map((e) => this.toDto(e));
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'file'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 32 },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiCreatedResponse({ type: EmoteResponseDto })
  async create(
    @Body() body: CreateEmoteDto,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: UserEntity,
  ): Promise<EmoteResponseDto> {
    if (!file) {
      throw new BadRequestException('file is required');
    }
    const emote = await this.emotesService.create(body.name, file, user.id);
    return this.toDto(emote);
  }

  private toDto(e: { id: string; name: string; imageUrl: string; uploadedBy: string; createdAt: Date }): EmoteResponseDto {
    return {
      id: e.id,
      name: e.name,
      imageUrl: e.imageUrl,
      uploadedBy: e.uploadedBy,
      createdAt: e.createdAt,
    };
  }
}
