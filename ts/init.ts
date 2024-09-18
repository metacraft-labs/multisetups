import { ArgumentParser } from "argparse";
import * as shelljs from "shelljs";
import * as fs from "fs";
import * as path from "path";
import {
    computeB3sum,
    FORMAT,
    getZkeyFiles,
    AZURE_SAS_TOKEN,
    validateZkeyDir,
} from "./utils";
import MerkleTree from "merkletreejs";

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser("init", { add_help: true });

    parser.add_argument("-d", "--dir", {
        required: true,
        action: "store",
        type: "str",
        help:
            "The directory that contains the .zkey files. Each .zkey " +
            "file must follow this naming scheme: " +
            FORMAT,
    });
};

const init = async (dirname: string) => {
    if (!fs.existsSync(dirname)) {
        console.error(`Error: ${dirname} does not exist`);
        return 1;
    }

    const isZkeyDirValid = validateZkeyDir(dirname) === 0;
    if (!isZkeyDirValid) {
        return 1;
    }

    const zkeyFiles = getZkeyFiles(dirname);

    let hashes = zkeyFiles.map((z) => computeB3sum(z.filename));

    const tree = new MerkleTree(hashes);

    const root = tree.getRoot().toString("hex");

    const cmd = `azcopy cp "${dirname}/*" "https://dendrethstorage.blob.core.windows.net/trusted-setup/${root}?${AZURE_SAS_TOKEN}" --recursive`;

    const out = shelljs.exec(cmd);
    if (out.code !== 0 || out.stderr) {
        console.error(`Error: could not add ${dirname} to S3.`);
        console.error(out.stderr);
        return 1;
    }

    console.log(
        "Ceremony initialised. Please give this root to the first participant."
    );
    console.log(root);

    return 0;
};

export { init, configureSubparsers };
