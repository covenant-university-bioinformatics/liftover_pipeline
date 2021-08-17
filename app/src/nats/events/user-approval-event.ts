import { Subjects } from './subject';

export interface UserApprovalEvent {
  subject: Subjects.UserApproval;
  data: any;
}

// {
//   id: number;
//   username: string;
//   role: UserRoles;
//   sex: Sex;
//   firstname: string;
//   lastname: string;
//   password: string;
//   email: string;
//   version: number;
//   createdAt: Timestamp;
//   updatedAt: Timestamp;
//   researchGroup: ResearchGroup;
//   salt: string;
// };
