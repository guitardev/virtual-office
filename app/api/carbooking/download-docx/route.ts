import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

export async function POST(req: NextRequest) {
  try {
    const bookingData = await req.json();

    const timestamp = Date.now();
    const tempDir = os.tmpdir();
    const inputJsonPath = path.join(tempDir, `car_booking_${timestamp}.json`);
    const outputDocxPath = path.join(tempDir, `car_booking_${timestamp}.docx`);

    await fs.writeFile(inputJsonPath, JSON.stringify(bookingData), "utf-8");

    const scriptPath = path.join(process.cwd(), "scripts", "generate_car_booking_docx.py");
    
    // Try python, py, python3 with shell: true for maximum cross-platform compatibility
    let pythonErr: any = null;
    let generated = false;
    for (const pyCmd of ["python", "py", "python3"]) {
      try {
        await execFileAsync(pyCmd, [scriptPath, inputJsonPath, outputDocxPath], { shell: true });
        generated = true;
        break;
      } catch (err: any) {
        pythonErr = err;
      }
    }

    if (!generated) {
      throw new Error(`ไม่สามารถประมวลผล Python ได้ (${pythonErr?.message || "Python command not found"})`);
    }

    const docxBuffer = await fs.readFile(outputDocxPath);

    // Clean up temporary files asynchronously
    Promise.all([
      fs.unlink(inputJsonPath).catch(() => {}),
      fs.unlink(outputDocxPath).catch(() => {}),
    ]);

    const filename = `Car_Booking_${bookingData.requestNo ? bookingData.requestNo.replace(/[^a-zA-Z0-9_-]/g, "_") : timestamp}.docx`;

    return new NextResponse(docxBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating car booking docx:", error);
    return NextResponse.json(
      { error: "Failed to generate Word document", details: error?.message },
      { status: 500 }
    );
  }
}
