import { MigrationInterface, QueryRunner } from "typeorm"

export class PlayTimeIndices1687847922729 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`CREATE INDEX "IDX_lookup_lastPlayed" ON "game" ("library", "lastPlayed") `);
      await queryRunner.query(`CREATE INDEX "IDX_lookup_playtime" ON "game" ("library", "playtime") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`DROP INDEX "IDX_lookup_lastPlayed"`);
      await queryRunner.query(`DROP INDEX "IDX_lookup_playtime"`);
    }
}
