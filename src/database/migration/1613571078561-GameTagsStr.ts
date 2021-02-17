import {MigrationInterface, QueryRunner} from "typeorm";

export class GameTagsStr1613571078561 implements MigrationInterface {
    name = 'GameTagsStr1613571078561'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_gameTitle"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_total"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_platform"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_series"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_publisher"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_developer"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateModified"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateAdded"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_title"`, undefined);
        await queryRunner.query(`CREATE TABLE "temporary_game" ("id" varchar PRIMARY KEY NOT NULL, "parentGameId" varchar, "title" varchar NOT NULL, "alternateTitles" varchar NOT NULL, "series" varchar NOT NULL, "developer" varchar NOT NULL, "publisher" varchar NOT NULL, "dateAdded" datetime NOT NULL, "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar NOT NULL, "status" varchar NOT NULL, "notes" varchar NOT NULL, "source" varchar NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar NOT NULL, "version" varchar NOT NULL, "originalDescription" varchar NOT NULL, "language" varchar NOT NULL, "library" varchar NOT NULL, "orderTitle" varchar NOT NULL, "activeDataId" integer, "activeDataOnDisk" boolean NOT NULL DEFAULT (0), "tagsStr" varchar COLLATE NOCASE NOT NULL DEFAULT (''), CONSTRAINT "FK_45a9180069d42ac8231ff11acd0" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "temporary_game"("id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle", "activeDataId", "activeDataOnDisk") SELECT "id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle", "activeDataId", "activeDataOnDisk" FROM "game"`, undefined);
        await queryRunner.query(`DROP TABLE "game"`, undefined);
        await queryRunner.query(`ALTER TABLE "temporary_game" RENAME TO "game"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_gameTitle" ON "game" ("title") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_total" ON "game" ("library", "broken", "extreme") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_platform" ON "game" ("library", "platform") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_series" ON "game" ("library", "series") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_publisher" ON "game" ("library", "publisher") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_developer" ON "game" ("library", "developer") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateModified" ON "game" ("library", "dateModified") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateAdded" ON "game" ("library", "dateAdded") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_title" ON "game" ("library", "title") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_sourcedata_hash" ON "source_data" ("sha256") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_sourcedata_sourceid" ON "source_data" ("sourceId") `, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP INDEX "IDX_sourcedata_sourceid"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_sourcedata_hash"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_title"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateAdded"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_dateModified"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_developer"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_publisher"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_series"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_lookup_platform"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_total"`, undefined);
        await queryRunner.query(`DROP INDEX "IDX_gameTitle"`, undefined);
        await queryRunner.query(`ALTER TABLE "game" RENAME TO "temporary_game"`, undefined);
        await queryRunner.query(`CREATE TABLE "game" ("id" varchar PRIMARY KEY NOT NULL, "parentGameId" varchar, "title" varchar NOT NULL, "alternateTitles" varchar NOT NULL, "series" varchar NOT NULL, "developer" varchar NOT NULL, "publisher" varchar NOT NULL, "dateAdded" datetime NOT NULL, "dateModified" datetime NOT NULL DEFAULT (datetime('now')), "platform" varchar NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar NOT NULL, "status" varchar NOT NULL, "notes" varchar NOT NULL, "source" varchar NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar NOT NULL, "version" varchar NOT NULL, "originalDescription" varchar NOT NULL, "language" varchar NOT NULL, "library" varchar NOT NULL, "orderTitle" varchar NOT NULL, "activeDataId" integer, "activeDataOnDisk" boolean NOT NULL DEFAULT (0), CONSTRAINT "FK_45a9180069d42ac8231ff11acd0" FOREIGN KEY ("parentGameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
        await queryRunner.query(`INSERT INTO "game"("id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle", "activeDataId", "activeDataOnDisk") SELECT "id", "parentGameId", "title", "alternateTitles", "series", "developer", "publisher", "dateAdded", "dateModified", "platform", "broken", "extreme", "playMode", "status", "notes", "source", "applicationPath", "launchCommand", "releaseDate", "version", "originalDescription", "language", "library", "orderTitle", "activeDataId", "activeDataOnDisk" FROM "temporary_game"`, undefined);
        await queryRunner.query(`DROP TABLE "temporary_game"`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_title" ON "game" ("library", "title") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateAdded" ON "game" ("library", "dateAdded") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_dateModified" ON "game" ("library", "dateModified") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_developer" ON "game" ("library", "developer") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_publisher" ON "game" ("library", "publisher") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_series" ON "game" ("library", "series") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_lookup_platform" ON "game" ("library", "platform") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_total" ON "game" ("library", "broken", "extreme") `, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_gameTitle" ON "game" ("title") `, undefined);
    }

}
