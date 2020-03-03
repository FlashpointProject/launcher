import {MigrationInterface, QueryRunner} from "typeorm";

export class Initial1583180635980 implements MigrationInterface {
    name = 'Initial1583180635980'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "tag_alias" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tagId" integer, "name" varchar COLLATE NOCASE NOT NULL, CONSTRAINT "UQ_34d6ff6807129b3b193aea26789" UNIQUE ("name"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_34d6ff6807129b3b193aea2678" ON "tag_alias" ("name") `, undefined);
        await queryRunner.query(`CREATE TABLE "tag_category" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "color" varchar NOT NULL, "description" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "tag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "primaryAliasId" integer, "categoryId" integer, "description" varchar, CONSTRAINT "REL_3c002904ab97fb1b4e61e8493c" UNIQUE ("primaryAliasId"))`, undefined);
        await queryRunner.query(`CREATE TABLE "game" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar COLLATE NOCASE NOT NULL, "alternateTitles" varchar COLLATE NOCASE NOT NULL, "series" varchar COLLATE NOCASE NOT NULL, "developer" varchar COLLATE NOCASE NOT NULL, "publisher" varchar COLLATE NOCASE NOT NULL, "dateAdded" datetime NOT NULL DEFAULT (datetime('now')), "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar COLLATE NOCASE NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar COLLATE NOCASE NOT NULL, "status" varchar COLLATE NOCASE NOT NULL, "notes" varchar COLLATE NOCASE NOT NULL, "source" varchar COLLATE NOCASE NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar COLLATE NOCASE NOT NULL, "version" varchar COLLATE NOCASE NOT NULL, "originalDescription" varchar COLLATE NOCASE NOT NULL, "language" varchar COLLATE NOCASE NOT NULL, "library" varchar COLLATE NOCASE NOT NULL, "orderTitle" varchar COLLATE NOCASE NOT NULL)`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_gameTitle" ON "game" ("title") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_total" ON "game" ("library", "broken", "extreme") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_platform" ON "game" ("library", "platform") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_series" ON "game" ("library", "series") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_publisher" ON "game" ("library", "publisher") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_developer" ON "game" ("library", "developer") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateModified" ON "game" ("library", "dateModified") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateAdded" ON "game" ("library", "dateAdded") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_title" ON "game" ("library", "title") `, undefined);
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar)`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar COLLATE NOCASE NOT NULL, "description" varchar COLLATE NOCASE NOT NULL, "author" varchar COLLATE NOCASE NOT NULL, "icon" varchar, "library" varchar NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "game_tags_tag" ("gameId" varchar NOT NULL, "tagId" integer NOT NULL, PRIMARY KEY ("gameId", "tagId"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_6366e7093c3571f85f1b5ffd4f" ON "game_tags_tag" ("gameId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_d12253f0cbce01f030a9ced11d" ON "game_tags_tag" ("tagId") `, undefined);
        await queryRunner.query(`DROP INDEX "IDX_34d6ff6807129b3b193aea2678"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_tag_alias" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tagId" integer, "name" varchar COLLATE NOCASE NOT NULL, CONSTRAINT "UQ_34d6ff6807129b3b193aea26789" UNIQUE ("name"), CONSTRAINT "FK_c838531770328702eb9e630bf05" FOREIGN KEY ("tagId") REFERENCES "tag" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_tag_alias"("id", "tagId", "name") SELECT "id", "tagId", "name" FROM "tag_alias"`, undefined);
        await queryRunner.query(`DROP TABLE "tag_alias"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_tag_alias" RENAME TO "tag_alias"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_34d6ff6807129b3b193aea2678" ON "tag_alias" ("name") `, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_tag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "primaryAliasId" integer, "categoryId" integer, "description" varchar, CONSTRAINT "REL_3c002904ab97fb1b4e61e8493c" UNIQUE ("primaryAliasId"), CONSTRAINT "FK_3c002904ab97fb1b4e61e8493cb" FOREIGN KEY ("primaryAliasId") REFERENCES "tag_alias" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_60fbdce32f9ca3b5afce15a9c32" FOREIGN KEY ("categoryId") REFERENCES "tag_category" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_tag"("id", "primaryAliasId", "categoryId", "description") SELECT "id", "primaryAliasId", "categoryId", "description" FROM "tag"`, undefined);
        await queryRunner.query(`DROP TABLE "tag"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_tag" RENAME TO "tag"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar, CONSTRAINT "FK_c174651de0daf9eae7878d06430" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_additional_app"("id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId") SELECT "id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId" FROM "additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_additional_app" RENAME TO "additional_app"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar, CONSTRAINT "FK_38567e9966c4d5776fb82d6fce5" FOREIGN KEY ("playlistId") REFERENCES "playlist" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_178854ad80431146589fa44418a" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_playlist_game"("id", "playlistId", "order", "notes", "gameId") SELECT "id", "playlistId", "order", "notes", "gameId" FROM "playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist_game"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_playlist_game" RENAME TO "playlist_game"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_6366e7093c3571f85f1b5ffd4f"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_d12253f0cbce01f030a9ced11d"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_game_tags_tag" ("gameId" varchar NOT NULL, "tagId" integer NOT NULL, CONSTRAINT "FK_6366e7093c3571f85f1b5ffd4f1" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, CONSTRAINT "FK_d12253f0cbce01f030a9ced11d6" FOREIGN KEY ("tagId") REFERENCES "tag" ("id") ON DELETE CASCADE ON UPDATE NO ACTION, PRIMARY KEY ("gameId", "tagId"))`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_game_tags_tag"("gameId", "tagId") SELECT "gameId", "tagId" FROM "game_tags_tag"`, undefined);
        await queryRunner.query(`DROP TABLE "game_tags_tag"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_game_tags_tag" RENAME TO "game_tags_tag"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_6366e7093c3571f85f1b5ffd4f" ON "game_tags_tag" ("gameId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_d12253f0cbce01f030a9ced11d" ON "game_tags_tag" ("tagId") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_d12253f0cbce01f030a9ced11d"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_6366e7093c3571f85f1b5ffd4f"`, undefined);
        await queryRunner.query(`ALTER TABLE "game_tags_tag" RENAME TO "temporary_game_tags_tag"`, undefined);
        await queryRunner.query(`CREATE TABLE "game_tags_tag" ("gameId" varchar NOT NULL, "tagId" integer NOT NULL, PRIMARY KEY ("gameId", "tagId"))`, undefined);
        await queryRunner.query(`INSERT INTO "game_tags_tag"("gameId", "tagId") SELECT "gameId", "tagId" FROM "temporary_game_tags_tag"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_game_tags_tag"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_d12253f0cbce01f030a9ced11d" ON "game_tags_tag" ("tagId") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_6366e7093c3571f85f1b5ffd4f" ON "game_tags_tag" ("gameId") `, undefined);
        await queryRunner.query(`ALTER TABLE "playlist_game" RENAME TO "temporary_playlist_game"`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar)`, undefined);
        await queryRunner.query(`INSERT INTO "playlist_game"("id", "playlistId", "order", "notes", "gameId") SELECT "id", "playlistId", "order", "notes", "gameId" FROM "temporary_playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_playlist_game"`, undefined);
        await queryRunner.query(`ALTER TABLE "additional_app" RENAME TO "temporary_additional_app"`, undefined);
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar COLLATE NOCASE NOT NULL, "waitForExit" boolean NOT NULL, "parentGameId" varchar)`, undefined);
        await queryRunner.query(`INSERT INTO "additional_app"("id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId") SELECT "id", "applicationPath", "autoRunBefore", "launchCommand", "name", "waitForExit", "parentGameId" FROM "temporary_additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_additional_app"`, undefined);
        await queryRunner.query(`ALTER TABLE "tag" RENAME TO "temporary_tag"`, undefined);
        await queryRunner.query(`CREATE TABLE "tag" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "primaryAliasId" integer, "categoryId" integer, "description" varchar, CONSTRAINT "REL_3c002904ab97fb1b4e61e8493c" UNIQUE ("primaryAliasId"))`, undefined);
        await queryRunner.query(`INSERT INTO "tag"("id", "primaryAliasId", "categoryId", "description") SELECT "id", "primaryAliasId", "categoryId", "description" FROM "temporary_tag"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_tag"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_34d6ff6807129b3b193aea2678"`, undefined);
        await queryRunner.query(`ALTER TABLE "tag_alias" RENAME TO "temporary_tag_alias"`, undefined);
        await queryRunner.query(`CREATE TABLE "tag_alias" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "tagId" integer, "name" varchar COLLATE NOCASE NOT NULL, CONSTRAINT "UQ_34d6ff6807129b3b193aea26789" UNIQUE ("name"))`, undefined);
        await queryRunner.query(`INSERT INTO "tag_alias"("id", "tagId", "name") SELECT "id", "tagId", "name" FROM "temporary_tag_alias"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_tag_alias"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_34d6ff6807129b3b193aea2678" ON "tag_alias" ("name") `, undefined);
        await queryRunner.query(`DROP INDEX "IDX_d12253f0cbce01f030a9ced11d"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_6366e7093c3571f85f1b5ffd4f"`, undefined);
        await queryRunner.query(`DROP TABLE "game_tags_tag"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_title"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateAdded"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateModified"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_developer"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_publisher"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_series"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_platform"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_total"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_gameTitle"`, undefined);
        await queryRunner.query(`DROP TABLE "game"`, undefined);
        await queryRunner.query(`DROP TABLE "tag"`, undefined);
        await queryRunner.query(`DROP TABLE "tag_category"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_34d6ff6807129b3b193aea2678"`, undefined);
        await queryRunner.query(`DROP TABLE "tag_alias"`, undefined);
    }

}
