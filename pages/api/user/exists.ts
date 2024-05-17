import apiWrapper, { NextApiRequestWrapper, ValidCommaSeparated, ValidEnum, ValidType } from "@root/helpers/apiWrapper";
import { UserModel } from "@root/models/mongoose";
import { NextApiResponse } from "next";

export default apiWrapper({
    GET: {
      query: {
        name: ValidType('string',true),
      }
    }
  }, async (req: NextApiRequestWrapper, res: NextApiResponse) => {
    const { name } = req.query as { name: string };
    const userExists = await UserModel.exists({ name });
    if (userExists) {
      return res.status(200).json({ exists: true });
    }
    return res.status(404).json({ exists: false });
  });
  