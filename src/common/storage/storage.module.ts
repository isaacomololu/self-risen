import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { SupabaseStorageService } from './supabase-storage.service';
import { config } from '../config';
import { StorageProvider } from './storage.service';

@Module({
  imports: [ConfigModule],
  controllers: [StorageController],
  providers: [
    {
      provide: SupabaseStorageService,
      useFactory: () => {
        // Always create SupabaseStorageService, but it won't validate config
        // until it's actually used (when provider is Supabase)
        return new SupabaseStorageService();
      },
    },
    {
      provide: StorageService,
      useFactory: (supabaseService: SupabaseStorageService) => {
        return new StorageService(supabaseService);
      },
      inject: [SupabaseStorageService],
    },
  ],
  exports: [StorageService],
})
export class StorageModule { }

