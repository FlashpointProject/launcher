import { Game } from '@database/entity/Game';
import { MigrationInterface, QueryRunner } from "typeorm"

export class TagifyPlatform1677943090621 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('PRAGMA foreign_keys=off;');
        // Create tables
        await queryRunner.query(`CREATE TABLE "platform_alias" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "platformId" integer, "name" varchar COLLATE NOCASE NOT NULL, CONSTRAINT "UQ_platform_alias_name_unique" UNIQUE ("name"))`);
        await queryRunner.query(`CREATE TABLE "platform" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "primaryAliasId" integer, "description" varchar, CONSTRAINT "REL_platform_primary_alias_unique" UNIQUE ("primaryAliasId"))`);
        await queryRunner.query(`CREATE TABLE "game_platforms_platform" ("gameId" varchar NOT NULL, "platformId" integer NOT NULL, PRIMARY KEY ("gameId", "platformId"))`)
        // Create platform aliases
        await queryRunner.query(`INSERT INTO "platform_alias" (name) SELECT DISTINCT "game"."platform" FROM "game"`);
        // Create Platform for each alias
        await queryRunner.query(`INSERT INTO "platform" (primaryAliasId) SELECT (id) FROM "platform_alias"`);
        await queryRunner.query(`UPDATE "platform_alias" SET "platformId" = (SELECT "platform"."id" FROM "platform" WHERE "platform"."primaryAliasId" == "platform_alias"."id")`);
        // Add entries for games
        await queryRunner.query(`INSERT INTO "game_platforms_platform" (gameId, platformId) SELECT "game"."id", "platform_alias"."platformId" FROM "game" LEFT JOIN "platform_alias" ON "platform_alias"."name" == "game"."platform"`);
        // Remove old "platform" game column
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_lookup_platform"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "platform"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('PRAGMA foreign_keys=off;');
        await queryRunner.query(`DROP TABLE "game_platforms_platform"`);
        await queryRunner.query(`DROP TABLE "platform"`);
        await queryRunner.query(`DROP TABLE "platform_alias"`);
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "platform" varchar COLLATE NOCASE NOT NULL`);
    }
}
