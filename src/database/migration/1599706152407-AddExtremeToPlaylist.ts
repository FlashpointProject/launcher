import {MigrationInterface, QueryRunner} from "typeorm";

export class AddExtremeToPlaylist1599706152407 implements MigrationInterface {
    name = 'AddExtremeToPlaylist1599706152407'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "temporary_playlist" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "description" varchar NOT NULL, "author" varchar NOT NULL, "icon" varchar, "library" varchar NOT NULL, "extreme" boolean NOT NULL DEFAULT (0))`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_playlist"("id", "title", "description", "author", "icon", "library") SELECT "id", "title", "description", "author", "icon", "library" FROM "playlist"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_playlist" RENAME TO "playlist"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "playlist" RENAME TO "temporary_playlist"`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "description" varchar NOT NULL, "author" varchar NOT NULL, "icon" varchar, "library" varchar NOT NULL)`, undefined);
        await queryRunner.query(`INSERT INTO "playlist"("id", "title", "description", "author", "icon", "library") SELECT "id", "title", "description", "author", "icon", "library" FROM "temporary_playlist"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_playlist"`, undefined);
    }

}
