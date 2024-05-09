import 'dotenv/config';
import bcrypt from "bcrypt";

import {RegisterResponse, SessionResponse, User, DBuserOutput} from "./userInterfaces";


export async function getUserByEmail(pool, email : string): Promise<DBuserOutput | null> {
  let conn;
  try {
    conn = await pool.getConnection();
    const user = await conn.query('SELECT email, password, username, id FROM users WHERE email = ? LIMIT 1', [email]);
    return user[0];
  } catch (err) {
    return null;
  } finally {
    if (conn) conn.end();
  }
}

export async function checkUsrExists(pool, email) : Promise<boolean>{
  const user = await getUserByEmail(pool, email);
  if(user){
    return true;
  }
  return false;
}

export async function createUser(pool, user: User): Promise<RegisterResponse> { //dev BUG its possible to create moultiple accounts with one email
  let conn;
  try {
    const userExist = await checkUsrExists(pool, user.email);
    if (!userExist) {
      conn = await pool.getConnection();
      const hash = await bcrypt.hash(user.password, 10);

      await conn.query(
        'INSERT INTO users (email, password, username) VALUES (?,?,?)',
        [user.email, hash, user.username],
      );

      return {registerSuccess: true};
    } else {
      return {registerSuccess: false, errorMessage: "There is already user with that email."};
    }
  } catch (err) {
    return {registerSuccess: false, errorMessage: `${err} --> Please contact with website administrator`};
  } finally {
    if(conn) conn.end();
  }
}

export async function login(pool, loginData : User): Promise<SessionResponse> {
  try {
    let user :DBuserOutput|null = await getUserByEmail(pool, loginData.email);
    if (user) {
      const result = await bcrypt.compare(loginData.password, user.password);
      if (result) {
        return {id: user.id, email:user.email};
      } else {
        return {error: 'Wrong password.'};
      }
    }
    return {error: 'There is no user with given email.'};
  } catch (err) {
    console.log(err);
    return {error: 'There was an error occurred. Please contact with server administrator or retry.'};
  }
}

export async function getUserById(pool, id : number): Promise<any> {
  let conn;
  try {
    conn = await pool.getConnection();
    const user = await conn.query('SELECT email, username FROM users WHERE id = ? LIMIT 1', [id]);
    return {user : user[0]};
  } catch (err) {
    return {user: null};
  } finally {
    if (conn) conn.end();
  }
}

export async function changePassword(pool, userData){
  let conn;
  try{
    conn = await pool.getConnection();
    const hash = await bcrypt.hash(userData.password, 10);
    await conn.query('UPDATE users SET password = ? WHERE email = ?', [hash, userData.email]);
  }catch(err){
    console.log(err);
  }finally{
    if(conn) conn.end()
  }
}