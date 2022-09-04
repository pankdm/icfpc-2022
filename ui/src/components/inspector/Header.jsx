import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tw } from "twind";
import { getProblems } from "../../api";
import { setAppState, useAppState } from "../../app-state";
import Spacer from "../common/Spacer";
import Button from "../common/Button";
import { Row } from "../common/Flex";
import { Select } from "../common/Inputs";

export function Header() {
  const { data } = useQuery(["problems"], getProblems);
  const { problemId } = useParams();
  const [hoverBlocksBothSides, setHoverBlocksBothSides] = useAppState('config.hoverBlocksOnBothSides');
  useEffect(() => {
    setAppState('currentProblemId', problemId);
  }, [problemId]);
  const navigate = useNavigate();
  const setProblemId = (id) => {
    navigate(`/problems/${id}`);
  };
  return (
    <Row
      gutter={2}
      className={tw`min-h-[4rem] py-2 px-4 bg-blue-500 text-white justify-center`}
    >
      <Spacer flex={1} />
      <p className={tw`font-bold text-xl`}>ICFPC 2022</p>
      <Spacer size={2} />
      <p className={tw`font-bold text-xl`}>Problem:</p>
      <Select
        value={problemId || "__none"}
        onChangeValue={setProblemId}
        className={tw`w-48`}
      >
        {!problemId && <option value="__none">&lt;Pick one&gt;</option>}
        {data?.problems?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </Select>
      <Spacer flex={0.5} />
      <p className={tw`text-lg font-bold`}>Hover on both sides:</p>
      <Button className={tw`w-24`} onClick={() => setHoverBlocksBothSides(!hoverBlocksBothSides)}>{hoverBlocksBothSides ? 'Enabled' : 'Disabled'}</Button>
    </Row>
  );
}
