import { ArgumentParser } from 'argparse'
import * as crypto from 'crypto'
import * as shelljs from 'shelljs'
import * as fs from 'fs'
import * as path from 'path'

import {
    FORMAT,
    S3_BUCKET,
    computeB3sum,
    countDirents,
    getZkeyFiles,
} from './utils'
import MerkleTree from 'merkletreejs'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'upload',
        { add_help: true },
    )

    parser.add_argument(
        '-d',
        '--dir',
        {
            required: true,
            action: 'store',
            type: 'str',
            help: 'The directory that contains the .zkey files. Each .zkey ' +
                'file must follow this naming scheme: ' + FORMAT
        }
    )

}

const upload = async (
    dirname: string,
) => {
    if (!fs.existsSync(dirname)) {
        console.log(`Error: ${dirname} does not exist`)
    }

    // The directory must not be empty
    const numFiles = countDirents(dirname)
    if (numFiles === 0) {
        console.error(`Error: ${dirname} should not be empty`)
        return 1
    }

    const zkeyFiles = getZkeyFiles(dirname)

    let hashes = zkeyFiles.map(z => computeB3sum(z.filename))

    const tree = new MerkleTree(hashes);

    const root = tree.getRoot().toString('hex');

    // Upload files
    const cmd = `aws s3 cp --recursive ${dirname} ${S3_BUCKET}/${root}`
    const out = shelljs.exec(cmd, { silent: true })
    if (out.code !== 0 || out.stderr) {
        console.error(`Error: could not add ${dirname} to AWS.`)
        console.error(out.stderr)
        return 1
    }

    console.log('Contribution uploaded. Please send this Hash root to the coordinator.')
    console.log(root)
    return 0
}

export {
    upload,
    configureSubparsers,
}
