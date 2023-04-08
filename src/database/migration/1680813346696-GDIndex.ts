import { MigrationInterface, QueryRunner } from "typeorm"

export class GDIndex1680813346696 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_game_data_game_id" ON "game_data" ("gameId", "dateAdded")`);
        await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_game_activeDataId" ON "game" ("activeDataId")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_game_data_game_id"`);
        await queryRunner.query(`DROP INDEX IF EXISTS "IDX_game_activeDataId"`);
    }

}
