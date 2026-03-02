import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: "mysql://root:@localhost:3306/bitespeed_db",
  },
});