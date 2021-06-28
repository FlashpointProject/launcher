import {MigrationInterface, QueryRunner} from "typeorm";

export class SourceDataUrlPath1612434225789 implements MigrationInterface {
    name = 'SourceDataUrlPath1612434225789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "temporary_source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar NOT NULL, "urlPath" varchar NOT NULL, CONSTRAINT "FK_acb50fae94d956d35c329dae2d7" FOREIGN KEY ("sourceId") REFERENCES "source" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "temporary_source_data"("id", "sourceId", "sha256") SELECT "id", "sourceId", "sha256" FROM "source_data"`);
        await queryRunner.query(`DROP TABLE "source_data"`);
        await queryRunner.query(`ALTER TABLE "temporary_source_data" RENAME TO "source_data"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "source_data" RENAME TO "temporary_source_data"`);
        await queryRunner.query(`CREATE TABLE "source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar NOT NULL, CONSTRAINT "FK_acb50fae94d956d35c329dae2d7" FOREIGN KEY ("sourceId") REFERENCES "source" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`);
        await queryRunner.query(`INSERT INTO "source_data"("id", "sourceId", "sha256") SELECT "id", "sourceId", "sha256" FROM "temporary_source_data"`);
        await queryRunner.query(`DROP TABLE "temporary_source_data"`);
    }

}
