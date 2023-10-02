import { MigrationInterface, QueryRunner } from "typeorm"

export class GameConfig1696150466000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "game_config" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar COLLATE NOCASE NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "owner" varchar COLLATE NOCASE NOT NULL, "middleware" varchar);`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "game_config";`);
    }
}
