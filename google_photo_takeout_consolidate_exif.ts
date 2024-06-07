import { parseArgs } from "jsr:@std/cli/parse-args";
import { exists } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { expandGlob } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { format } from 'npm:date-fns'

const flags = parseArgs(Deno.args, { boolean: ['help'], string: ["exiftool-bin"] });

function usage () {
    console.log('<DIRECTORY>')
} 

if (flags.help) {
    usage()
    Deno.exit();
}  

function EXIF_DateTimeOriginal(metadata) {
    const photoTakenTime = metadata.default.photoTakenTime?.timestamp
    if (!photoTakenTime) return "";

    return `-DateTimeOriginal="${format(new Date(photoTakenTime * 1000), 'yyyy:MM:dd HH:mm:ss')}"` 
}

function EXIF_GPS(metadata) {
    const { latitude, longitude } = metadata.default.geoDataExif
    if (!latitude || !longitude) return "";

    return `-GPSLatitude=${latitude.toFixed(6)} -GPSLatitudeRef=N -GPSLongitude=${longitude.toFixed(6)} -GPSLongitudeRef=W`
}

async function main () {
    assert("exiftool-bin" in flags, 'missing exiftool-bin path')
    assert(await exists(flags['exiftool-bin'], { isFile: true }), 'exiftool-bin path is not a binary')

    const [directory] = flags._
    assert(await exists(directory), 'target directory is not a valid directory') 

    for await (const entry of expandGlob("**/*(*.jpg|*.jpeg)", { root: directory })) {
        let metadata;
        try {
            metadata = await import('file://' + entry.path + '.json', {
                with: { type: "json" },
            });
        } catch (e) {
            console.log(`❌ No .json file found for ${entry.path}`)
            continue;
        }
        
        // console.log(EXIF_DateTimeOriginal(metadata))
        // console.log(EXIF_GPS(metadata))
        const command = [
            EXIF_DateTimeOriginal(metadata),
            EXIF_GPS(metadata)
        ].join(' ')

        console.log(command)

        
      }

}

await main()