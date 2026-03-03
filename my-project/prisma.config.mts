import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: "mysql://root:@127.0.0.1:3306/bitespeed_db",
  },
});