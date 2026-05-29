#!/usr/bin/env python3
"""Create or promote a user to admin. Run once after first launch."""
import asyncio
import sys
from sqlalchemy import select
from app.db.database import AsyncSessionLocal, init_db
from app.models.user import User
from app.models.organization import Organization
from app.core.auth import hash_password


async def main():
    await init_db()

    email = input("Admin email: ").strip()
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()

        if user:
            user.role = "admin"
            user.is_active = True
            await db.commit()
            print(f"Promoted {user.full_name} ({email}) to admin.")
        else:
            full_name = input("Full name: ").strip()
            password = input("Password: ").strip()

            org = Organization(name="Platform Admin", slug="platform-admin")
            db.add(org)
            await db.flush()

            admin = User(
                email=email,
                full_name=full_name,
                hashed_password=hash_password(password),
                role="admin",
                organization_id=org.id,
            )
            db.add(admin)
            await db.commit()
            print(f"Created admin user {full_name} ({email}).")


if __name__ == "__main__":
    asyncio.run(main())
