import asyncio
import logging
from sqlalchemy import text
from app.core.database import AsyncSessionLocal, engine, init_db
from app.main import auto_seed_default_brand, auto_seed_demo_accounts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reset_db")

async def reset_database():
    logger.info("Starting complete database purge...")
    async with engine.begin() as conn:
        try:
            await conn.execute(text("""
                TRUNCATE TABLE 
                    review_comments, 
                    workflow_events, 
                    audit_findings, 
                    submission_revisions, 
                    submissions, 
                    guideline_chunks, 
                    rulesets, 
                    campaigns, 
                    user_accounts, 
                    brand_profiles 
                CASCADE;
            """))
            logger.info("Successfully truncated all tables via CASCADE!")
        except Exception as e:
            logger.error(f"Truncate failed: {e}")
            raise e

    # Re-initialize all schemas & patches
    logger.info("Verifying table schemas...")
    await init_db()

    # Auto-seed clean default brand and demo accounts
    logger.info("Auto-seeding pristine Blinkit brand from manifest...")
    await auto_seed_default_brand()

    logger.info("Auto-seeding clean demo accounts...")
    await auto_seed_demo_accounts()

    logger.info("Database reset complete! Pristine clean state achieved.")

if __name__ == "__main__":
    asyncio.run(reset_database())
