import {MigrationInterface, QueryRunner} from "typeorm";

export class RemoveSources1676712700000 implements MigrationInterface {
    name = 'RemoveSources1676712700000'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "source_data"`, undefined);
        await queryRunner.query(`DROP TABLE "source"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "source" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "name" varchar NOT NULL, "dateAdded" datetime NOT NULL, "lastUpdated" datetime NOT NULL, "sourceFileUrl" varchar NOT NULL, "baseUrl" varchar NOT NULL, "count" integer NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "source_data" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "sourceId" integer, "sha256" varchar NOT NULL, "urlPath" varchar NOT NULL, CONSTRAINT "FK_acb50fae94d956d35c329dae2d7" FOREIGN KEY ("sourceId") REFERENCES "source" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
    }
}
