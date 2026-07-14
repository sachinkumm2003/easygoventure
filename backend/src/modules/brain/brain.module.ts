import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BrainConfig, BrainConfigSchema } from './schemas/brain-config.schema';
import { BrainService } from './brain.service';
import { BrainController } from './brain.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: BrainConfig.name, schema: BrainConfigSchema }]),
  ],
  controllers: [BrainController],
  providers: [BrainService],
  exports: [BrainService],
})
export class BrainModule {}
