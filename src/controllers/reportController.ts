import { Request, Response } from 'express';
import { QueryResult } from 'pg';
import * as dbUtil from './../utils/dbUtil';

interface Report {
    year: number,
    caregivers: {
        name: string,
        patients: string[]
    }[]
}

function yearMatches(row: any, year: number) {
    return year === 0  || new Date(row.visit_date).getFullYear() === year;
}

export const getReport = async (req: Request, res: Response) => {

    const sql = `
        SELECT
            caregiver.id      AS caregiver_id,
            caregiver.name    AS caregiver_name,
            patient.id        AS patient_id,
            patient.name      AS patient_name,
            visit.date        AS visit_date
        FROM caregiver
        JOIN visit ON visit.caregiver = caregiver.id
        JOIN patient ON patient.id = visit.patient
    `;

    let result : QueryResult;
    try {
        result = await dbUtil.sqlToDB(sql, []);
        let fullYear = parseInt(req.params.year);
        const report: Report = {
            year: fullYear,
            caregivers: []
        };

        let caregiverMap = new Map<string, string[]>();
        for (let row of result.rows) {
            if(yearMatches(row, fullYear)){
                let key = row.caregiver_name;
                if (caregiverMap.has(key)) {
                    let careGiverPatients = caregiverMap.get(key);
                    if (careGiverPatients !== undefined) {
                        if (!careGiverPatients.includes(row.patient_name)) {
                            let arr = careGiverPatients;
                            arr.push(row.patient_name);

                            caregiverMap.set(key, arr);
                        }
                    }
                } else {
                    caregiverMap.set(key, [row.patient_name]);
                }
            }
        }
        for (let caregiverName of caregiverMap.keys()) {
            report.caregivers.push({
                name: caregiverName,
                patients: caregiverMap.get(caregiverName)!!
            });
        }

        res.status(200).json(report);
    } catch (error) {
        throw new Error(error.message);
    }
}