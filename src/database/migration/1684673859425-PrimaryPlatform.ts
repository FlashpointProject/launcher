import { MigrationInterface, QueryRunner } from "typeorm"

export class PrimaryPlatform1684673859425 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "platformId" integer`);
        await queryRunner.query(`ALTER TABLE "game" ADD COLUMN "platformName" varchar`);
        await queryRunner.query(`UPDATE "game" 
            SET "platformId" = (
                SELECT "platformId" FROM "game_platforms_platform" WHERE "game"."id" = "game_platforms_platform"."gameId"
            )`);
        await queryRunner.query(`UPDATE "game" 
            SET "platformName" = (
                SELECT "name" FROM "platform_alias" WHERE "platform_alias"."id" = (
                    SELECT "primaryAliasId" FROM "platform" WHERE "platform"."id" = "game"."platformId"
                )
            )`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "platformId"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "platformName"`);
    }

}
