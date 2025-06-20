import { User } from "firebase/auth";

export interface AppUser extends User {
  name?: string;
}

export interface FirestoreDocument {
  id: string;
  [key: string]: any;
}