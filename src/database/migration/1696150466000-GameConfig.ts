import { MigrationInterface, QueryRunner } from "typeorm"

export class GameConfig1696150466000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "game_config" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar COLLATE NOCASE NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "owner" varchar COLLATE NOCASE NOT NULL, "middleware" varchar);`);
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "activeGameConfigId" integer`);
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "activeGameConfigOwner" varchar COLLATE NOCASE`);
        await queryRunner.query(`CREATE INDEX "IDX_game_config_game_id" ON "game_config" ("gameId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_game_config_game_id"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "activeGameConfigOwner"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "activeGameConfigId"`);
        await queryRunner.query(`DROP TABLE "game_config";`);
    }
}
