import {Subjects} from "./subject";
import {NewJobDto} from "../dto/new-job.dto";

export interface NewJobEvent {
    subject: Subjects.NewJob;
    data: NewJobDto;
}
