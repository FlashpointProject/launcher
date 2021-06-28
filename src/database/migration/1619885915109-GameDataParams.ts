import {MigrationInterface, QueryRunner} from "typeorm";

export class GameDataParams1619885915109 implements MigrationInterface {
    name = 'GameDataParams1619885915109'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "temporary_game_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar, "title" varchar NOT NULL, "dateAdded" datetime NOT NULL, "sha256" varchar NOT NULL, "crc32" integer NOT NULL, "presentOnDisk" boolean NOT NULL DEFAULT (0), "path" varchar, "size" integer NOT NULL, "parameters" varchar, CONSTRAINT "FK_8854ee113e5b5d9c43ff9ee1c8b" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_game_data"("id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size") SELECT "id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size" FROM "game_data"`, undefined);
        await queryRunner.query(`DROP TABLE "game_data"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_game_data" RENAME TO "game_data"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "game_data" RENAME TO "temporary_game_data"`, undefined);
        await queryRunner.query(`CREATE TABLE "game_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar, "title" varchar NOT NULL, "dateAdded" datetime NOT NULL, "sha256" varchar NOT NULL, "crc32" integer NOT NULL, "presentOnDisk" boolean NOT NULL DEFAULT (0), "path" varchar, "size" integer NOT NULL, CONSTRAINT "FK_8854ee113e5b5d9c43ff9ee1c8b" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "game_data"("id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size") SELECT "id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size" FROM "temporary_game_data"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_game_data"`, undefined);
    }

}
