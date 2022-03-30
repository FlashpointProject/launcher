import {MigrationInterface, QueryRunner} from "typeorm";

export class ChildCurations1648251821422 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE game ADD extras varchar`, undefined);
        await queryRunner.query(`ALTER TABLE game ADD extrasName varchar`, undefined);
        await queryRunner.query(`ALTER TABLE game ADD message varchar`, undefined);
        await queryRunner.query(`UPDATE game SET message = a.launchCommand FROM additional_app a WHERE game.id=a.parentGameId AND a.applicationPath=':message:'`);
        await queryRunner.query(`UPDATE game SET extras = a.launchCommand, extrasName = a.name FROM additional_app a WHERE game.id = a.parentGameId AND a.applicationPath = ':extras:'`, undefined);
        await queryRunner.query(`UPDATE game SET parentGameId = NULL WHERE id IS parentGameId`, undefined);
        await queryRunner.query(`INSERT INTO game SELECT a.id,a.parentGameId,a.name AS title,"" AS alternateTitles,"" AS series,"" AS developer,"" AS publisher,"0000-00-00 00:00:00.000" AS dateAdded,"0000-00-00 00:00:00.000" AS dateModified,"" AS platform,false AS broken,g.extreme AS extreme,"" AS playMode,"" AS status,"" AS notes,"" AS source,a.applicationPath,a.launchCommand,"" AS releaseDate,"" AS version,"" AS originalDescription,"" AS language,library,LOWER(a.name) AS orderTitle,NULL AS activeDataId,false AS activeDataOnDisk,"" AS tagsStr,NULL as extras,NULL AS extrasName,NULL AS message FROM additional_app a INNER JOIN game g ON a.parentGameId = g.id WHERE a.applicationPath != ':message:' AND a.applicationPath != ':extras:'`, undefined);
        await queryRunner.query(`DROP TABLE additional_app`, undefined);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
