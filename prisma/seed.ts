// import { PrismaClient } from '@prisma/client'
// import bcrypt from 'bcrypt'

// const prisma = new PrismaClient()

// async function main() {
//   // Common password hash for '123456'
//   const password = await bcrypt.hash('123456', 10)

//   const users = [
//     {
//       name: 'Admin User',
//       email: 'admin@crm.com',
//       password,
//       role: 'admin',
//       isOnline: false,
//     },
//     {
//       name: 'Operator 1',
//       email: 'operator1@crm.com',
//       password,
//       role: 'operator',
//       isOnline: false,
//     },
//     {
//       name: 'Operator 2',
//       email: 'operator2@crm.com',
//       password,
//       role: 'operator',
//       isOnline: false,
//     },
//     {
//       name: 'Operator 3',
//       email: 'operator3@crm.com',
//       password,
//       role: 'operator',
//       isOnline: false,
//     },
//   ]

//   for (const user of users) {
//     // Upsert users (create if not exists)
//     await prisma.user.upsert({
//       where: { email: user.email },
//       update: {},
//       create: user,
//     })
//   }

//   console.log('Seed users created successfully.')
// }

// main()
//   .catch(e => {
//     console.error(e)
//     process.exit(1)
//   })
//   .finally(async () => {
//     await prisma.$disconnect()
//   })

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  // Hash for password '123456'
  const password = await bcrypt.hash("123456", 10);

  const adminUser = {
    name: "Admin User",
    email: "madiluretailpvtltd@gmail.com",
    password,
    role: "admin",
    isOnline: false,
  };

  // Upsert the admin user (create if not exists)
  await prisma.user.upsert({
    where: { email: adminUser.email },
    update: {},
    create: adminUser,
  });

  console.log("Admin user created successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
