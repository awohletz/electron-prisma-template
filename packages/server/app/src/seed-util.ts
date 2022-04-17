import {PrismaClient} from "./generated/client";

export async function seed(prisma: PrismaClient) {
  await prisma.user.create({
    data: {
      email: "example@user.com",
      name: "Example User",
      bio: "I am an example user",
    }
  });
}
