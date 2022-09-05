import React, { useMemo } from "react";
import { useNavigate, useRoutes } from "react-router-dom";
import _ from "lodash";
import { useQuery } from "@tanstack/react-query";
import { tw } from "twind";
import Spacer from "./common/Spacer";
import { Col, Row } from "./common/Flex";
import API, { getProblemImgUrl, getProblemSolutionImgUrl, getProblemStartImgUrl, ICFPC } from "../api";
import { HeaderLink } from "./common/HeaderLink";
import { css } from "twind/css";
import { format } from "date-fns";
import { useAppState } from "../app-state";


function ProblemItem({problem, ...props}) {
  const {
    problem_id: id,
    problem_name: name,
    min_cost,
    overall_best_cost,
    last_submitted_at,
  } = problem
  const lastSubmitted = new Date(last_submitted_at)
  const bounty = min_cost - overall_best_cost
  const showStart = id >= 26;
  return (
    <a href={`/problems/${id}`}>
      <Row gutter={2} className={tw`px-3 py-2 shadow hover:shadow-md transition cursor-pointer`} {...props}>
        {showStart ?
          (<img width={120} height={120} src={getProblemStartImgUrl(id)} />)
          : (<img width={120} height={120}></img>)}
        <img width={120} height={120} src={getProblemImgUrl(id)} />
        <img width={120} height={120} src={getProblemSolutionImgUrl(id)} />
        <p className={tw`flex-1`}>{id}: {name}</p>
        <p className={tw`w-24`}>{min_cost}</p>
        <p className={tw`w-24`}>{overall_best_cost}</p>
        <p className={tw`w-24`}>{bounty}</p>
        <p className={tw`w-28`}>{format(lastSubmitted, 'MMM d, HH:mm')}</p>
      </Row>
    </a>
  )
}

const sortPredicates = {
  name: p => p.problem_id,
  bounty: p => -(p.min_cost - p.overall_best_cost),
}

export default function Browser() {
  const { data, loading } = useQuery(['problems'], API.getProblems)
  const problems = data?.problems
  const [sortKey, setSortKey] = useAppState('browserSortKey')
  const sortedProblems = _.sortBy(problems, sortPredicates[sortKey||'name'])
  return (
    <div className={tw`min-w-[900px] flex flex-col h-screen overflow-hidden`}>
      <Row
        className={tw`min-h-[4rem] py-2 bg-blue-500 text-white justify-center`}
      >
        <Row gutter={2} className={tw(`px-3`, css({flexBasis: '960px'}))}>
          <p className={tw`font-bold text-2xl`}>ICFPC-2022</p>
          <Spacer size={2} />
        </Row>
      </Row>
      <Row gutter={2} className={tw`max-w-[1200px] w-full px-3 py-2 mx-auto font-bold`}>
        <div className={tw`w-[120px]`} />
        <div className={tw`w-[120px]`} />
        <div className={tw`w-1`} />
        <p className={tw`cursor-pointer hover:underline flex-1`} onClick={() => setSortKey('name')}>Problem
          {sortKey == "name" ? " ↓" : ""}
        </p>
        <p className={tw`w-24`}>Our Best</p>
        <p className={tw`w-24`}>Record</p>
        <p className={tw`cursor-pointer hover:underline w-24`} onClick={() => setSortKey('bounty')}>Bounty
        {sortKey == "bounty" ? " ↓" : ""}

        </p>
        <p className={tw`w-28`}>Last Upload</p>
      </Row>
      {loading && (
        <p className={tw`text-2xl`}>Loading...</p>
      )}
      <div className={tw`flex-1 w-full overflow-auto mx-auto`}>
        <Col gutter={2} className={tw`max-w-[1200px] w-full items-stretch mx-auto`}>
          {sortedProblems?.map((p, idx) => (
            <ProblemItem key={idx} problem={p} />
          ))}
          <Spacer/>
        </Col>
      </div>
    </div>
  );
}
