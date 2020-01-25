import {MigrationInterface, QueryRunner} from "typeorm";

export class GamesAddApps1579903877891 implements MigrationInterface {
    name = 'GamesAddApps1579903877891'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "game" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "alternateTitles" varchar NOT NULL, "series" varchar NOT NULL, "developer" varchar NOT NULL, "publisher" varchar NOT NULL, "dateAdded" varchar NOT NULL, "platform" varchar NOT NULL, "broken" boolean NOT NULL, "extreme" boolean NOT NULL, "playMode" varchar NOT NULL, "status" varchar NOT NULL, "notes" varchar NOT NULL, "tags" varchar NOT NULL, "source" varchar NOT NULL, "applicationPath" varchar NOT NULL, "launchCommand" varchar NOT NULL, "releaseDate" varchar NOT NULL, "version" varchar NOT NULL, "originalDescription" varchar NOT NULL, "language" varchar NOT NULL, "library" varchar NOT NULL, "orderTitle" varchar NOT NULL)`, undefined);
        await queryRunner.query(`CREATE TABLE "additional_app" ("id" varchar PRIMARY KEY NOT NULL, "applicationPath" varchar NOT NULL, "autoRunBefore" boolean NOT NULL, "launchCommand" varchar NOT NULL, "name" varchar NOT NULL, "waitForExit" boolean NOT NULL)`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "additional_app"`, undefined);
        await queryRunner.query(`DROP TABLE "game"`, undefined);
    }

}
