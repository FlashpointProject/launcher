import {MigrationInterface, QueryRunner} from "typeorm";

export class GameData1611753257950 implements MigrationInterface {
    name = 'GameData1611753257950'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "game_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar, "title" varchar COLLATE NOCASE NOT NULL, "dateAdded" datetime NOT NULL, "sha256" varchar COLLATE NOCASE NOT NULL, "crc32" integer NOT NULL, "presentOnDisk" boolean NOT NULL DEFAULT (0), "path" varchar, "size" integer NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar COLLATE NOCASE NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "source" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "url" varchar NOT NULL, "dateAdded" datetime NOT NULL, "lastUpdated" datetime NOT NULL)`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_title"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateAdded"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateModified"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_developer"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_publisher"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_series"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_platform"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_total"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_gameTitle"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_game" ("id" varchar PRIMARY KEY NOT NULL, "parentGameId" varchar, "title" varchar NOT NULL, "alternateTitles" varchar NOT NULL, "series" varchar NOT NULL, "developer" varchar NOT NULL, "publisher" varchar NOT NULL, "dateAdded" datetime NOT NULL, "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar NOT NULL, "status" varchar NOT NULL, "notes" varchar NOT NULL, "source" varchar NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar NOT NULL, "version" varchar NOT NULL, "originalDescription" varchar NOT NULL, "language" varchar NOT NULL, "library" varchar NOT NULL, "orderTitle" varchar NOT NULL, "activeDataId" integer, "activeDataOnDisk" boolean NOT NULL DEFAULT (0), CONSTRAINT "FK_45a9180069d42ac8231ff11acd0" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_game"("id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle") SELECT "id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle" FROM "game"`, undefined);
        await queryRunner.query(`DROP TABLE "game"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_game" RENAME TO "game"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_title" ON "game" ("library", "title") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateAdded" ON "game" ("library", "dateAdded") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateModified" ON "game" ("library", "dateModified") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_developer" ON "game" ("library", "developer") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_publisher" ON "game" ("library", "publisher") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_series" ON "game" ("library", "series") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_platform" ON "game" ("library", "platform") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_total" ON "game" ("library", "broken", "extreme") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_gameTitle" ON "game" ("title") `, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_game_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar, "title" varchar COLLATE NOCASE NOT NULL, "dateAdded" datetime NOT NULL, "sha256" varchar COLLATE NOCASE NOT NULL, "crc32" integer NOT NULL, "presentOnDisk" boolean NOT NULL DEFAULT (0), "path" varchar, "size" integer NOT NULL, CONSTRAINT "FK_8854ee113e5b5d9c43ff9ee1c8b" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_game_data"("id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size") SELECT "id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size" FROM "game_data"`, undefined);
        await queryRunner.query(`DROP TABLE "game_data"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_game_data" RENAME TO "game_data"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar COLLATE NOCASE NOT NULL, CONSTRAINT "FK_acb50fae94d956d35c329dae2d7" FOREIGN KEY ("sourceId") REFERENCES "source" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_source_data"("id", "sourceId", "sha256") SELECT "id", "sourceId", "sha256" FROM "source_data"`, undefined);
        await queryRunner.query(`DROP TABLE "source_data"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_source_data" RENAME TO "source_data"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "source_data" RENAME TO "temporary_source_data"`, undefined);
        await queryRunner.query(`CREATE TABLE "source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar COLLATE NOCASE NOT NULL)`, undefined);
        await queryRunner.query(`INSERT INTO "source_data"("id", "sourceId", "sha256") SELECT "id", "sourceId", "sha256" FROM "temporary_source_data"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_source_data"`, undefined);
        await queryRunner.query(`ALTER TABLE "game_data" RENAME TO "temporary_game_data"`, undefined);
        await queryRunner.query(`CREATE TABLE "game_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "gameId" varchar, "title" varchar COLLATE NOCASE NOT NULL, "dateAdded" datetime NOT NULL, "sha256" varchar COLLATE NOCASE NOT NULL, "crc32" integer NOT NULL, "presentOnDisk" boolean NOT NULL DEFAULT (0), "path" varchar, "size" integer NOT NULL)`, undefined);
        await queryRunner.query(`INSERT INTO "game_data"("id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size") SELECT "id", "gameId", "title", "dateAdded", "sha256", "crc32", "presentOnDisk", "path", "size" FROM "temporary_game_data"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_game_data"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_gameTitle"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_total"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_platform"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_series"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_publisher"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_developer"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateModified"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateAdded"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_title"`, undefined);
        await queryRunner.query(`ALTER TABLE "game" RENAME TO "temporary_game"`, undefined);
        await queryRunner.query(`CREATE TABLE "game" ("id" varchar PRIMARY KEY NOT NULL, "parentGameId" varchar, "title" varchar NOT NULL, "alternateTitles" varchar NOT NULL, "series" varchar NOT NULL, "developer" varchar NOT NULL, "publisher" varchar NOT NULL, "dateAdded" datetime NOT NULL, "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar NOT NULL, "status" varchar NOT NULL, "notes" varchar NOT NULL, "source" varchar NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar NOT NULL, "version" varchar NOT NULL, "originalDescription" varchar NOT NULL, "language" varchar NOT NULL, "library" varchar NOT NULL, "orderTitle" varchar NOT NULL, CONSTRAINT "FK_45a9180069d42ac8231ff11acd0" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "game"("id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle") SELECT "id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle" FROM "temporary_game"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_game"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_gameTitle" ON "game" ("title") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_total" ON "game" ("library", "broken", "extreme") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_platform" ON "game" ("library", "platform") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_series" ON "game" ("library", "series") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_publisher" ON "game" ("library", "publisher") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_developer" ON "game" ("library", "developer") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateModified" ON "game" ("library", "dateModified") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateAdded" ON "game" ("library", "dateAdded") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_title" ON "game" ("library", "title") `, undefined);
        await queryRunner.query(`DROP TABLE "source"`, undefined);
        await queryRunner.query(`DROP TABLE "source_data"`, undefined);
        await queryRunner.query(`DROP TABLE "game_data"`, undefined);
    }

}
