import {MigrationInterface, QueryRunner} from "typeorm";

export class InitialModels1579981665328 implements MigrationInterface {
    name = 'InitialModels1579981665328'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "game" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "alternateTitles" varchar NOT NULL, "series" varchar NOT NULL, "developer" varchar NOT NULL, "publisher" varchar NOT NULL, "dateAdded" datetime NOT NULL DEFAULT (datetime('now')), "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar NOT NULL, "status" varchar NOT NULL, "notes" varchar NOT NULL, "tags" varchar NOT NULL, "source" varchar NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar NOT NULL, "version" varchar NOT NULL, "originalDescription" varchar NOT NULL, "language" varchar NOT NULL, "library" varchar NOT NULL, "orderTitle" varchar NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "description" varchar NOT NULL, "author" varchar NOT NULL, "icon" varchar, "library" varchar NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar, CONSTRAINT "FK_c174651de0daf9eae7878d06430" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_additional_app"("id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId") SELECT "id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId" FROM "additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_additional_app" RENAME TO "additional_app"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar, CONSTRAINT "FK_178854ad80431146589fa44418a" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
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
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar)`, undefined);
        await queryRunner.query(`INSERT INTO "additional_app"("id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId") SELECT "id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId" FROM "temporary_additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "game"`, undefined);
    }

}
