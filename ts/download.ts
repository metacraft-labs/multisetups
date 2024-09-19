import { ArgumentParser } from 'argparse'
import * as crypto from 'crypto'
import * as shelljs from 'shelljs'
import * as fs from 'fs'
import * as path from 'path'

import {
    validateZkeyDir,
    countDirents,
    S3_BUCKET,
} from './utils'

const configureSubparsers = (subparsers: ArgumentParser) => {
    const parser = subparsers.add_parser(
        'download',
        { add_help: true },
    )

    parser.add_argument(
        '-hash',
        '--hashroot',
        {
            required: true,
            action: 'store',
            type: 'str',
            help: 'The hash that you received from the coordinator.'
        }
    )

    parser.add_argument(
        '-d',
        '--dir',
        {
            required: true,
            action: 'store',
            type: 'str',
            help: 'The directory to store the downloaded .zkey files.',
        }
    )

}

const download = async (
    hash: string,
    dirname: string,
) => {
    if (!fs.existsSync(dirname)) {
        fs.mkdirSync(dirname)
    }

    // The directory must be empty
    const numFiles = countDirents(dirname)
    if (numFiles > 0) {
        console.error(`Error: ${dirname} should be empty`)
        return 1
    }

    // Download files
    const cmd = `aws s3 cp --recursive ${S3_BUCKET}/${hash} ./${dirname}`
    const out = shelljs.exec(cmd)

    if (out.code !== 0) {
        console.error(`Error: could not download files from aws ${S3_BUCKET}/${hash}`)
        console.error(out.code, out.stderr)
        return 1
    }

    const isZkeyDirValid = validateZkeyDir(dirname) === 0
    if (!isZkeyDirValid) {
        return 1
    }

    return 0
}

export {
    download,
    configureSubparsers,
}
