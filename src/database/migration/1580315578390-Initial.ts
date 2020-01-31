import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1580315578390 implements MigrationInterface {
    name = 'Initial1580315578390'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "game" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar COLLATE NOCASE NOT NULL, "alternateTitles" varchar COLLATE NOCASE NOT NULL, "series" varchar COLLATE NOCASE NOT NULL, "developer" varchar COLLATE NOCASE NOT NULL, "publisher" varchar COLLATE NOCASE NOT NULL, "dateAdded" datetime NOT NULL DEFAULT (datetime('now')), "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar COLLATE NOCASE NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar COLLATE NOCASE NOT NULL, "status" varchar COLLATE NOCASE NOT NULL, "notes" varchar COLLATE NOCASE NOT NULL, "tags" varchar COLLATE NOCASE NOT NULL, "source" varchar COLLATE NOCASE NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar COLLATE NOCASE NOT NULL, "version" varchar COLLATE NOCASE NOT NULL, "originalDescription" varchar COLLATE NOCASE NOT NULL, "language" varchar COLLATE NOCASE NOT NULL, "library" varchar COLLATE NOCASE NOT NULL, "orderTitle" varchar COLLATE NOCASE NOT NULL)`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_gameTitle" ON "game" ("title") `, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_pageLookup" ON "game" ("id", "title") `, undefined);
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar COLLATE NOCASE NOT NULL, "description" varchar COLLATE NOCASE NOT NULL, "author" varchar COLLATE NOCASE NOT NULL, "icon" varchar, "library" varchar NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar, CONSTRAINT "FK_c174651de0daf9eae7878d06430" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_additional_app"("id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId") SELECT "id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId" FROM "additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_additional_app" RENAME TO "additional_app"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar, CONSTRAINT "FK_38567e9966c4d5776fb82d6fce5" FOREIGN KEY ("playlistId") REFERENCES "playlist" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_178854ad80431146589fa44418a" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_playlist_game"("id", "playlistId", "order", "notes", "gameId") SELECT "id", "playlistId", "order", "notes", "gameId" FROM "playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist_game"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_playlist_game" RENAME TO "playlist_game"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "playlist_game" RENAME TO "temporary_playlist_game"`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar)`, undefined);
        await queryRunner.query(`INSERT INTO "playlist_game"("id", "playlistId", "order", "notes", "gameId") SELECT "id", "playlistId", "order", "notes", "gameId" FROM "temporary_playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_playlist_game"`, undefined);
        await queryRunner.query(`ALTER TABLE "additional_app" RENAME TO "temporary_additional_app"`, undefined);
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar)`, undefined);
        await queryRunner.query(`INSERT INTO "additional_app"("id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId") SELECT "id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId" FROM "temporary_additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_pageLookup"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_gameTitle"`, undefined);
        await queryRunner.query(`DROP TABLE "game"`, undefined);
    }

}
