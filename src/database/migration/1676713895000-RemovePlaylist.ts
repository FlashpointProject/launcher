import {MigrationInterface, QueryRunner} from "typeorm";

export class RemovePlaylist1676713895000 implements MigrationInterface {
    name = 'RemovePlaylist1676713895000'

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`DROP TABLE "playlist_game"`, undefined);
        await queryRunner.query(`DROP TABLE "playlist"`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "playlist" ("id" varchar PRIMARY KEY NOT NULL, "title" varchar NOT NULL, "description" varchar NOT NULL, "author" varchar NOT NULL, "icon" varchar, "library" varchar NOT NULL, "extreme" boolean NOT NULL DEFAULT (0))`, undefined);
        await queryRunner.query(`CREATE TABLE "playlist_game" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "playlistId" varchar NOT NULL, "order" integer NOT NULL, "notes" varchar NOT NULL, "gameId" varchar, CONSTRAINT "FK_38567e9966c4d5776fb82d6fce5" FOREIGN KEY ("playlistId") REFERENCES "playlist" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION, CONSTRAINT "FK_178854ad80431146589fa44418a" FOREIGN KEY ("gameId") REFERENCES "game" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION)`, undefined);
    }
}
