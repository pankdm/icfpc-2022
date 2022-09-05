import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { tw } from "twind";
import { getProblems, submitSolution } from "../../api";
import Spacer from "../common/Spacer";
import Button from "../common/Button";
import { Row } from "../common/Flex";
import { HeaderLink } from "../common/HeaderLink";
import { setAppState, useAppState } from "../../app-state";
import { css } from "twind/css";
import { Select } from "../common/Inputs";
import { useStore } from "@nanostores/react";
import { solutionError } from "../Inspector.stores";
import { sleep } from "../../utils/utils";

export function Header() {
  const { data } = useQuery(["problems"], getProblems);
  const [code] = useAppState('currentCode')
  const _solutionError = useStore(solutionError)
  const codeBroken = !!_solutionError?.error
  const { problemId } = useParams();
  useEffect(() => {
    setAppState('currentProblemId', problemId)
  }, [problemId])
  const [submitting, setSubmitting] = useState(null)
  const confirmSubmitSolution = async () => {
    const confirmed = window.confirm('Confirm submission?',)
    if (!confirmed) return
    setSubmitting('Submitting')
    await submitSolution(problemId, code)
    setSubmitting('Done')
    await sleep(1000)
    setSubmitting(null)
  }
  const [hoverBlocksBothSides, setHoverBlocksBothSides] = useAppState('config.hoverBlocksOnBothSides');
  return (
    <Row
      gutter={2}
      className={tw`min-h-[4rem] py-2 px-4 bg-blue-500 text-white justify-center`}
    >
      <Row className={tw`w-[24rem]`}>
        <Button color='blue' onClick={confirmSubmitSolution} disabled={submitting||codeBroken}>{submitting || 'Submit Solution'}</Button>
      </Row>
      <Spacer flex={1} />
      <Row gutter={2} className={tw(`px-3`, css({ flexBasis: '960px' }))}>
        <HeaderLink to='/all-problems'>← Challenges</HeaderLink>
        <p className={tw`font-bold text-xl`}>Problem</p>
        <Select
          value={problemId || "__none"}
          onChangeValue={(id) => { window.location.href = `/problems/${id}` }}
          className={tw`w-48`}
        >
          {!problemId && <option value="__none">&lt;Pick one&gt;</option>}
          {data?.problems?.map((opt) => (
            <option key={opt.problem_id} value={opt.problem_id}>
              {opt.problem_id}
            </option>
          ))}
        </Select>
      </Row>
      <Spacer flex={1} />
      <Row className={tw`w-[24rem]`}>
        <Spacer flex={1} />
        <p className={tw`text-lg font-bold`}>Hover on both sides:</p>
        <Button className={tw`w-24`} onClick={() => setHoverBlocksBothSides(!hoverBlocksBothSides)}>{hoverBlocksBothSides ? 'Enabled' : 'Disabled'}</Button>
      </Row>
    </Row>
  );
}
