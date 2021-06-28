import {MigrationInterface, QueryRunner} from "typeorm";

export class SourceFileURL1612435692266 implements MigrationInterface {
    name = 'SourceFileURL1612435692266'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_source" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "dateAdded" datetime NOT NULL, "lastUpdated" datetime NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_source"("id", "name", "dateAdded", "lastUpdated") SELECT "id", "name", "dateAdded", "lastUpdated" FROM "source"`);
        await queryRunner.query(`DROP TABLE "source"`);
        await queryRunner.query(`ALTER TABLE "temporary_source" RENAME TO "source"`);
        await queryRunner.query(`CREATE TABLE "temporary_source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar NOT NULL, "urlPath" varchar NOT NULL, CONSTRAINT "FK_acb50fae94d956d35c329dae2d7" FOREIGN KEY ("sourceId") REFERENCES "source" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_source_data"("id", "sourceId", "sha256") SELECT "id", "sourceId", "sha256" FROM "source_data"`);
        await queryRunner.query(`DROP TABLE "source_data"`);
        await queryRunner.query(`ALTER TABLE "temporary_source_data" RENAME TO "source_data"`);
        await queryRunner.query(`CREATE TABLE "temporary_source" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "dateAdded" datetime NOT NULL, "lastUpdated" datetime NOT NULL, "sourceFileUrl" varchar NOT NULL, "baseUrl" varchar NOT NULL)`);
        await queryRunner.query(`INSERT INTO "temporary_source"("id", "name", "dateAdded", "lastUpdated") SELECT "id", "name", "dateAdded", "lastUpdated" FROM "source"`);
        await queryRunner.query(`DROP TABLE "source"`);
        await queryRunner.query(`ALTER TABLE "temporary_source" RENAME TO "source"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "source" RENAME TO "temporary_source"`);
        await queryRunner.query(`CREATE TABLE "source" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "dateAdded" datetime NOT NULL, "lastUpdated" datetime NOT NULL)`);
        await queryRunner.query(`INSERT INTO "source"("id", "name", "dateAdded", "lastUpdated") SELECT "id", "name", "dateAdded", "lastUpdated" FROM "temporary_source"`);
        await queryRunner.query(`DROP TABLE "temporary_source"`);
        await queryRunner.query(`ALTER TABLE "source_data" RENAME TO "temporary_source_data"`);
        await queryRunner.query(`CREATE TABLE "source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar NOT NULL, CONSTRAINT "FK_acb50fae94d956d35c329dae2d7" FOREIGN KEY ("sourceId") REFERENCES "source" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "source_data"("id", "sourceId", "sha256") SELECT "id", "sourceId", "sha256" FROM "temporary_source_data"`);
        await queryRunner.query(`DROP TABLE "temporary_source_data"`);
        await queryRunner.query(`ALTER TABLE "source" RENAME TO "temporary_source"`);
        await queryRunner.query(`CREATE TABLE "source" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "url" varchar NOT NULL, "dateAdded" datetime NOT NULL, "lastUpdated" datetime NOT NULL)`);
        await queryRunner.query(`INSERT INTO "source"("id", "name", "dateAdded", "lastUpdated") SELECT "id", "name", "dateAdded", "lastUpdated" FROM "temporary_source"`);
        await queryRunner.query(`DROP TABLE "temporary_source"`);
    }

}
