import React, { useMemo } from "react";
import { useNavigate, useRoutes } from "react-router-dom";
import _ from "lodash";
import { useQuery } from "@tanstack/react-query";
import { tw } from "twind";
import Spacer from "./common/Spacer";
import { Col, Row } from "./common/Flex";
import API, { getProblemImgUrl, ICFPC } from "../api";
import { HeaderLink } from "./common/HeaderLink";
import { css } from "twind/css";


function ProblemItem({id, ...props}) {
  const navigate = useNavigate()
  const onClick = () => {
    navigate(`/problems/${id}`)
  }
  return (
    <Row gutter={2} className={tw`px-3 py-2 shadow hover:shadow-md transition cursor-pointer`} onClick={onClick} {...props}>
      <img width={120} height={120} src={getProblemImgUrl(id)} />
      <p className={tw`text-lg`}>Problem {id}</p>
    </Row>
  )
}

export default function Browser() {
  // const { data } = useQuery(['problems'], ICFPC.getScoreboard)
  const { data } = useQuery(['problems'], API.getProblems)
  const problems = data?.problems
  // console.log(data, problems)
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
      <div className={tw`flex-1 w-full overflow-auto mx-auto`}>
        <Col gutter={2} className={tw`max-w-[960px] w-full items-stretch mx-auto`}>
          {problems?.map((p, idx) => (
            <ProblemItem key={idx} id={idx+1} />
          ))}
          <Spacer/>
        </Col>
      </div>
    </div>
  );
}
