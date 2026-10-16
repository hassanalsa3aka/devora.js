import { Module } from "@nestjs/common";
import { BenchController } from "./bench.controller";

@Module({ controllers: [BenchController] })
export class AppModule {}
