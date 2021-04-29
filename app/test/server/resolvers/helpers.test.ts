import {
  findHelpersForRun,
  findHelpersForTest,
  helpersResolver,
} from "../../../server/resolvers/helpers";
import * as treeService from "../../../server/services/gitHub/tree";
import { prepareTestDb } from "../db";
import {
  buildRun,
  buildSuite,
  buildTeam,
  buildTest,
  buildTrigger,
  buildUser,
  testContext,
} from "../utils";

const team = buildTeam({ helpers: "team helpers" });

const db = prepareTestDb();
const context = { ...testContext, db, teams: [team] };
const options = { db, logger: context.logger };

beforeAll(async () => {
  await db("teams").insert(team);
  await db("users").insert(buildUser({}));

  await db("triggers").insert(buildTrigger({}));
  await db("suites").insert(buildSuite({ helpers: "helpers" }));

  await db("tests").insert(buildTest({}));
  await db("runs").insert(buildRun({ suite_id: "suiteId" }));
});

describe("findHelpersForRun", () => {
  it("returns helpers of associated suite", async () => {
    const helpers = await findHelpersForRun(
      { run_id: "runId", teams: context.teams },
      options
    );

    expect(helpers).toBe("helpers");
  });

  it("throws an error if run not found", async () => {
    await expect(
      async (): Promise<string> => {
        return findHelpersForRun(
          { run_id: "fakeId", teams: context.teams },
          options
        );
      }
    ).rejects.toThrowError("not found");
  });
});

describe("findHelpersForTest", () => {
  it("returns the helpers for the test's team", async () => {
    jest.spyOn(treeService, "findFilesForBranch");

    const helpers = await findHelpersForTest(
      { teams: context.teams, test_id: "testId" },
      options
    );

    expect(helpers).toBe("team helpers");
    expect(treeService.findFilesForBranch).not.toBeCalled();
  });

  it("returns the helpers for the branch if specified", async () => {
    jest.spyOn(treeService, "findFilesForBranch").mockResolvedValue({
      files: [
        {
          path: "qawolf/helpers/index.js",
          sha: "helpersSha",
          text: "git helpers",
        },
        {
          path: "qawolf/myTest.test.js",
          sha: "sha",
          text: "// code",
        },
      ],
      owner: "qawolf",
      repo: "repo",
    });

    const helpers = await findHelpersForTest(
      {
        branch: "feature",
        teams: [
          { ...context.teams[0], git_sync_integration_id: "integrationId" },
        ],
        test_id: "testId",
      },
      options
    );

    expect(helpers).toBe("git helpers");
  });
});

describe("helpersResolver", () => {
  it("returns helpers from suite if run id passed", async () => {
    const helpers = await helpersResolver({}, { run_id: "runId" }, context);

    expect(helpers).toBe("helpers");
  });

  it("returns helpres from team if test id passed", async () => {
    const helpers = await helpersResolver({}, { test_id: "testId" }, context);

    expect(helpers).toBe("team helpers");
  });

  it("returns helpers from branch if branch passed", async () => {
    jest.spyOn(treeService, "findFilesForBranch").mockResolvedValue({
      files: [
        {
          path: "qawolf/helpers/index.js",
          sha: "helpersSha",
          text: "git helpers",
        },
        {
          path: "qawolf/myTest.test.js",
          sha: "sha",
          text: "// code",
        },
      ],
      owner: "qawolf",
      repo: "repo",
    });

    const helpers = await helpersResolver(
      {},
      { branch: "main", test_id: "testId" },
      {
        ...context,
        teams: [
          { ...context.teams[0], git_sync_integration_id: "integrationId" },
        ],
      }
    );

    expect(helpers).toBe("git helpers");
  });

  it("throws an error if no run or test id passed", async () => {
    await expect(
      async (): Promise<string> => {
        return helpersResolver({}, {}, context);
      }
    ).rejects.toThrowError("Must provide test_id or run_id");
  });
});
