import type { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { asAnon, asUser, connect, createUser } from "./helpers";

let db: Client;
let ines: string;
let marc: string;

beforeAll(async () => {
  db = await connect();
  ines = await createUser(db, "ines.avatar@example.com", { full_name: "Inès Martin" });
  marc = await createUser(db, "marc.avatar@example.com", { full_name: "Marc Leroy" });
});

afterAll(async () => {
  await db.end();
});

const upload = (path: string) =>
  db.query("insert into storage.objects (bucket_id, name) values ('avatars', $1)", [path]);

describe("avatar storage", () => {
  it("lets users upload into their own folder", async () => {
    await expect(asUser(db, ines, () => upload(`${ines}/avatar-1.webp`))).resolves.toBeDefined();
  });

  it("refuses uploads into another user's folder", async () => {
    await expect(asUser(db, ines, () => upload(`${marc}/avatar-1.webp`))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("refuses uploads at the root of the bucket", async () => {
    await expect(asUser(db, ines, () => upload("avatar.webp"))).rejects.toThrow(/row-level security/);
  });

  it("refuses anonymous uploads", async () => {
    await expect(asAnon(db, () => upload(`${ines}/avatar-2.webp`))).rejects.toThrow(
      /row-level security/,
    );
  });

  it("only accepts an avatar path inside the user's own folder", async () => {
    await asUser(db, ines, async () => {
      await db.query("update public.profiles set avatar_path = $1 where id = $2", [
        `${ines}/avatar-1.webp`,
        ines,
      ]);
      await expect(
        db.query("update public.profiles set avatar_path = $1 where id = $2", [`${marc}/avatar-1.webp`, ines]),
      ).rejects.toThrow(/profiles_avatar_in_own_folder/);
    });
  });
});
