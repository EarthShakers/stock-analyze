import os
import asyncio
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from datetime import datetime
from langchain_openai import ChatOpenAI
from langchain.schema import HumanMessage, AIMessage

from .agent_states import AgentState
from .mcp_manager import MCPManager


class BaseAgent(ABC):
    """基础智能体类 - 所有智能体的基类"""
    
    def __init__(self, agent_name: str, mcp_manager: MCPManager, role_description: str = ""):
        self.agent_name = agent_name
        self.mcp_manager = mcp_manager
        self.role_description = role_description
        
        # 获取LLM实例
        self.llm = mcp_manager.llm
        
        # 检查是否启用MCP工具
        self.mcp_enabled = mcp_manager.is_agent_mcp_enabled(agent_name)
        
        # 不在初始化时获取工具，而是在使用时动态获取
        self.available_tools = []
        
        # 延迟创建智能体实例，等到MCP工具初始化完成后再创建
        self.agent = None
        
        print(f"智能体 {agent_name} 初始化完成，MCP工具: {'启用' if self.mcp_enabled else '禁用'}")
    
    def ensure_agent_created(self):
        """确保智能体实例已创建（在MCP工具初始化后调用）"""
        if self.agent is None:
            self.agent = self.mcp_manager.create_agent_with_tools(self.agent_name)
            print(f"智能体 {self.agent_name} 实例创建完成")
    
    @abstractmethod
    def get_system_prompt(self, state: AgentState) -> str:
        """获取系统提示词 - 子类必须实现"""
        pass
    
    @abstractmethod
    async def process(self, state: AgentState) -> AgentState:
        """处理智能体逻辑 - 子类必须实现"""
        pass
    
    def build_context_prompt(self, state: AgentState) -> str:
        """构建上下文提示词"""
        context_parts = []
        
        # 添加当前日期时间信息
        current_datetime = datetime.now()
        context_parts.append(f"当前日期时间: {current_datetime.strftime('%Y年%m月%d日 %H:%M:%S')} ({current_datetime.strftime('%A')})")
        
        # 处理状态可能是字典或AgentState对象的情况
        if isinstance(state, dict):
            user_query = state.get('user_query', '')
            investment_plan = state.get('investment_plan', '')
            trader_investment_plan = state.get('trader_investment_plan', '')
            
            # 获取报告
            company_overview_report = state.get('company_overview_report', '')
            market_report = state.get('market_report', '')
            sentiment_report = state.get('sentiment_report', '')
            news_report = state.get('news_report', '')
            fundamentals_report = state.get('fundamentals_report', '')
            shareholder_report = state.get('shareholder_report', '')
            product_report = state.get('product_report', '')
            
            reports = {
                "company_overview_report": company_overview_report,
                "market_report": market_report,
                "sentiment_report": sentiment_report,
                "news_report": news_report,
                "fundamentals_report": fundamentals_report,
                "shareholder_report": shareholder_report,
                "product_report": product_report
            }
            
            # 获取辩论历史
            investment_debate_state = state.get('investment_debate_state', {})
            risk_debate_state = state.get('risk_debate_state', {})
            investment_history = investment_debate_state.get("history", "")
            risk_history = risk_debate_state.get("history", "")
            
            debate_summary = ""
            if investment_history:
                debate_summary += f"投资辩论历史:\n{investment_history}\n\n"
            if risk_history:
                debate_summary += f"风险管理辩论历史:\n{risk_history}\n\n"
            debate_summary = debate_summary.strip()
        else:
            user_query = state.user_query
            investment_plan = state.investment_plan
            trader_investment_plan = state.trader_investment_plan
            reports = state.get_all_reports()
            debate_summary = state.get_debate_summary()
        
        # 基础信息
        context_parts.append(f"用户问题: {user_query}")
        # 交易日期和市场类型信息现在通过当前日期时间提供
        
        # 分析师报告
        for report_name, report_content in reports.items():
            if report_content.strip():
                context_parts.append(f"{report_name}: {report_content}")
        
        # 辩论历史
        if debate_summary:
            context_parts.append(f"辩论历史:\n{debate_summary}")
        
        # 投资计划
        if investment_plan:
            context_parts.append(f"研究经理决策: {investment_plan}")
        
        # 交易员计划
        if trader_investment_plan:
            context_parts.append(f"交易员计划: {trader_investment_plan}")
        
        return "\n\n".join(context_parts)
    
    def build_analyst_context_prompt(self, state: AgentState) -> str:
        """为分析师构建上下文提示词（包含company_details占位符）"""
        context_parts = []
        
        # 添加当前日期时间信息
        current_datetime = datetime.now()
        context_parts.append(f"当前日期时间: {current_datetime.strftime('%Y年%m月%d日 %H:%M:%S')} ({current_datetime.strftime('%A')})")
        
        # 处理状态可能是字典或AgentState对象的情况
        if isinstance(state, dict):
            user_query = state.get('user_query', '')
            company_details = state.get('company_details', '')
        else:
            user_query = state.user_query
            company_details = state.company_details
        
        # 基础信息
        context_parts.append(f"用户问题: {user_query}")
        
        # 公司基础信息（仅供分析师使用）
        if company_details.strip():
            context_parts.append(f"公司基础信息: {company_details}")
        
        return "\n\n".join(context_parts)
    

    
    async def call_llm_with_context(self, state: AgentState, user_message: str, progress_tracker=None) -> str:
        """调用LLM并处理上下文"""
        try:
            # 确保智能体实例已创建
            self.ensure_agent_created()
            
            # 记录开始执行（只在没有已存在的running状态agent时才记录）
            if progress_tracker:
                # 检查是否已经有正在运行的同名agent
                should_start_new = True
                if hasattr(progress_tracker, 'session_data'):
                    for agent in progress_tracker.session_data.get("agents", []):
                        if agent.get("agent_name") == self.agent_name and agent.get("status") == "running":
                            should_start_new = False
                            break
                
                if should_start_new:
                    if hasattr(progress_tracker, 'start_agent'):
                        # 构建系统提示和上下文信息
                        system_prompt = self.get_system_prompt(state)
                        # 全局输出格式规范：连续段落，不使用标题符号/项目符号/编号
                        system_prompt = (
                            system_prompt
                            + "\n\n输出格式要求：请将本次输出写成一篇完整的说明文，使用连续段落表述，不要使用标题符号（如##）、项目符号或编号，保持逻辑清晰、语言连贯。若需输出代码/伪代码，可使用代码块，不受上述限制。"
                        )
                        is_analyst = self.agent_name.endswith('_analyst')
                        if is_analyst:
                            context_prompt = self.build_analyst_context_prompt(state)
                        else:
                            context_prompt = self.build_context_prompt(state)
                        
                        # 新的ProgressManager接口
                        progress_tracker.start_agent(
                            agent_name=self.agent_name, 
                            action=f"分析: {user_message}",
                            system_prompt=system_prompt,
                            user_prompt=user_message,
                            context=context_prompt
                        )
                    elif hasattr(progress_tracker, 'log_agent_start'):
                        # 旧的ProgressTracker接口（兼容性）
                        progress_tracker.log_agent_start(self.agent_name, {
                            "user_message_length": len(user_message),
                            "mcp_enabled": self.mcp_enabled,
                            "available_tools_count": len(self.available_tools) if self.available_tools else 0
                        })
            
            # 开始分析
            print(f"🤖 [{self.agent_name}] 开始分析...")

            # 构建系统提示和上下文（如果之前没有构建的话）
            if 'system_prompt' not in locals():
                system_prompt = self.get_system_prompt(state)
                # 全局输出格式规范：连续段落，不使用标题符号/项目符号/编号
                system_prompt = (
                    system_prompt
                    + "\n\n输出格式要求：请将本次输出写成一篇完整的说明文，使用连续段落表述，不要使用标题符号（如##）、项目符号或编号，保持逻辑清晰、语言连贯。若需输出代码/伪代码，可使用代码块，不受上述限制。"
                )
            if 'context_prompt' not in locals():
                # 检查是否是分析师，如果是则使用专门的分析师上下文
                is_analyst = self.agent_name.endswith('_analyst')
                if is_analyst:
                    context_prompt = self.build_analyst_context_prompt(state)
                else:
                    context_prompt = self.build_context_prompt(state)
            
            # 将系统和上下文组合成一个系统消息
            system_level_prompt = f"""{system_prompt}

{context_prompt}"""

            # 动态获取当前可用工具
            current_tools = self.mcp_manager.get_tools_for_agent(self.agent_name) if self.mcp_enabled else []

            # 打印一次当前LLM关键配置
            try:
                print(
                    f"[LLM CALL] agent={self.agent_name}, model={getattr(self.llm, 'model', getattr(self.llm, 'model_name', None))}, "
                    f"temperature={getattr(self.llm, 'temperature', None)}, max_tokens={getattr(self.llm, 'max_tokens', None)}"
                )
            except Exception as _:
                pass

            async def stream_plain_llm(full_prompt: str) -> str:
                chunks: List[str] = []
                async for chunk in self.llm.astream([HumanMessage(content=full_prompt)]):
                    cancel_checker = getattr(progress_tracker, "cancel_checker", None)
                    if callable(cancel_checker) and cancel_checker():
                        raise asyncio.CancelledError("分析已被用户取消")
                    text = getattr(chunk, "content", "")
                    if isinstance(text, list):
                        text = "".join(
                            item.get("text", "") if isinstance(item, dict) else str(item)
                            for item in text
                        )
                    if not text:
                        continue
                    chunks.append(text)
                    if progress_tracker and hasattr(progress_tracker, 'update_agent_output'):
                        progress_tracker.update_agent_output(self.agent_name, "".join(chunks))
                return "".join(chunks)

            # 如果启用了MCP工具，使用智能体（参考test.py的简洁方式）
            if self.mcp_enabled and current_tools and self.mcp_manager.client:
                print(f"⚡ [{self.agent_name}] 正在调用LLM（带MCP工具）...")
                
                try:
                    # 构建简单的消息列表，让框架自动处理工具绑定
                    messages = [
                        {"role": "system", "content": system_level_prompt},
                        {"role": "user", "content": user_message}
                    ]

                    response = await self.agent.ainvoke({
                        "messages": messages
                    })
                    
                    # 解析和显示工具调用信息
                    messages = response.get("messages", [])
                    tool_calls_found = []
                    
                    for msg in messages:
                        # 检查是否是工具调用消息
                        if hasattr(msg, 'tool_calls') and msg.tool_calls:
                            for tool_call in msg.tool_calls:
                                tool_name = tool_call.get('name', 'unknown')
                                tool_args = tool_call.get('args', {})
                                tool_id = tool_call.get('id', 'unknown')
                                
                                print(f"🔧 [{self.agent_name}] 调用工具: {tool_name}")
                                print(f"   参数: {tool_args}")
                                
                                tool_calls_found.append({
                                    'tool_name': tool_name,
                                    'tool_args': tool_args,
                                    'tool_id': tool_id
                                })
                        
                        # 检查是否是工具返回结果消息
                        elif hasattr(msg, 'tool_call_id'):
                            tool_result = getattr(msg, 'content', 'No result')
                            print(f"📋 [{self.agent_name}] 工具返回结果: {str(tool_result)[:200]}...")
                            
                            # 找到对应的工具调用并记录完整信息
                            for tool_call in tool_calls_found:
                                if tool_call.get('tool_id') == getattr(msg, 'tool_call_id', None):
                                    # 记录到progress_tracker
                                    if progress_tracker:
                                        progress_tracker.add_mcp_tool_call(
                                            agent_name=self.agent_name,
                                            tool_name=tool_call['tool_name'],
                                            tool_args=tool_call['tool_args'],
                                            tool_result=tool_result
                                        )
                                
                                # 记录到state
                                if isinstance(state, dict):
                                    if 'mcp_tool_calls' not in state:
                                        state['mcp_tool_calls'] = []
                                    state['mcp_tool_calls'].append({
                                        'agent_name': self.agent_name,
                                        'tool_name': tool_call['tool_name'],
                                        'tool_args': tool_call['tool_args'],
                                        'tool_result': str(tool_result),
                                        'timestamp': datetime.now().isoformat()
                                    })
                                else:
                                    state.add_mcp_tool_call(
                                        agent_name=self.agent_name,
                                        tool_name=tool_call['tool_name'],
                                        tool_args=tool_call['tool_args'],
                                        tool_result=tool_result
                                    )
                        
                        # 提取最终回复
                        if messages:
                            # 通常最后一个消息是最终的AI回复
                            final_message = messages[-1]
                            if hasattr(final_message, 'content'):
                                result = final_message.content
                            else:
                                result = "(无法提取内容)"
                        else:
                            result = "(未收到消息)"
                        
                except Exception as mcp_error:
                    print(f"⚠️ [{self.agent_name}] MCP工具调用失败，回退到无工具模式: {mcp_error}")
                    # 回退到无工具模式
                    full_prompt = f"""{system_level_prompt}\n\n用户请求: {user_message}"""
                    result = await stream_plain_llm(full_prompt)
            else:
                # 如果没有启用MCP工具，直接调用LLM
                print(f"⚡ [{self.agent_name}] 正在调用LLM（无工具）...")
                full_prompt = f"""{system_level_prompt}\n\n用户请求: {user_message}"""
                result = await stream_plain_llm(full_prompt)

                
            # 记录执行
            execution_action = "LLM调用(带MCP工具)" if self.mcp_enabled and current_tools and self.mcp_manager.client else "LLM调用(无工具)"
            execution_mcp_used = bool(self.mcp_enabled and current_tools and self.mcp_manager.client)
            if isinstance(state, dict):
                if 'agent_executions' not in state:
                    state['agent_executions'] = []
                state['agent_executions'].append({
                    'agent_name': self.agent_name,
                    'action': execution_action,
                    'result': result,
                    'mcp_used': execution_mcp_used
                })
            else:
                state.add_agent_execution(
                    agent_name=self.agent_name,
                    action=execution_action,
                    result=result,
                    mcp_used=execution_mcp_used
                )
            
            # 显示分析结果
            print(f"✅ [{self.agent_name}] 分析完成，结果长度: {len(result)} 字符")
            
            # 记录执行完成
            if progress_tracker:
                if hasattr(progress_tracker, 'complete_agent'):
                    # 修复：传递完整的result内容而不是True
                    progress_tracker.complete_agent(self.agent_name, result, True)
                elif hasattr(progress_tracker, 'log_agent_complete'):
                    # 旧的ProgressTracker接口（兼容性）
                    progress_tracker.log_agent_complete(self.agent_name, result, {
                        "result_length": len(result),
                        "success": True,
                        "mcp_used": self.mcp_enabled and self.available_tools
                    })
            
            return result
            
        except Exception as e:
            error_msg = f"LLM调用失败: {str(e)}"
            print(f"❌ 智能体 {self.agent_name} - {error_msg}")
            
            # 记录执行失败
            if progress_tracker:
                if hasattr(progress_tracker, 'complete_agent'):
                    # 修复：传递错误信息而不是False
                    progress_tracker.complete_agent(self.agent_name, error_msg, False)
                elif hasattr(progress_tracker, 'log_agent_complete'):
                    # 旧的ProgressTracker接口（兼容性）
                    progress_tracker.log_agent_complete(self.agent_name, error_msg, {
                        "error": error_msg,
                        "success": False
                    })
            
            if isinstance(state, dict):
                if 'errors' not in state:
                    state['errors'] = []
                state['errors'].append(f"{self.agent_name}: {error_msg}")
            else:
                state.add_error(f"{self.agent_name}: {error_msg}")
            return f"抱歉，处理过程中出现错误: {error_msg}"
    
    async def call_mcp_tool(self, state: AgentState, tool_name: str, tool_args: Dict) -> Any:
        """调用MCP工具"""
        if not self.mcp_enabled:
            error_msg = f"智能体 {self.agent_name} 未启用MCP工具"
            print(f"⚠️ {error_msg}")
            if isinstance(state, dict):
                if 'warnings' not in state:
                    state['warnings'] = []
                state['warnings'].append(error_msg)
            else:
                state.add_warning(error_msg)
            return {"error": error_msg}
        
        try:
            print(f"🔧 [{self.agent_name}] 准备调用工具: {tool_name}")
            
            result = await self.mcp_manager.call_tool_for_agent(
                agent_name=self.agent_name,
                tool_name=tool_name,
                tool_args=tool_args
            )
            
            # 记录工具调用
            if isinstance(state, dict):
                if 'mcp_tool_calls' not in state:
                    state['mcp_tool_calls'] = []
                state['mcp_tool_calls'].append({
                    'agent_name': self.agent_name,
                    'tool_name': tool_name,
                    'tool_args': tool_args,
                    'tool_result': result
                })
            else:
                state.add_mcp_tool_call(
                    agent_name=self.agent_name,
                    tool_name=tool_name,
                    tool_args=tool_args,
                    tool_result=result
                )
            
            # 显示工具调用结果
            result_str = str(result)
            print(f"✅ [{self.agent_name}] 工具 {tool_name} 调用成功，结果长度: {len(result_str)} 字符")
            
            return result
            
        except Exception as e:
            error_msg = f"MCP工具调用失败: {str(e)}"
            print(f"❌ [{self.agent_name}] {error_msg}")
            if isinstance(state, dict):
                if 'errors' not in state:
                    state['errors'] = []
                state['errors'].append(f"{self.agent_name}: {error_msg}")
            else:
                state.add_error(f"{self.agent_name}: {error_msg}")
            return {"error": error_msg}
    
    def get_agent_info(self) -> Dict[str, Any]:
        """获取智能体信息"""
        return {
            "name": self.agent_name,
            "role_description": self.role_description,
            "mcp_enabled": self.mcp_enabled,
            "available_tools_count": len(self.available_tools),
            "available_tools": [tool.name for tool in self.available_tools] if self.available_tools else []
        }
    
    def validate_state(self, state: AgentState) -> bool:
        """验证状态有效性"""
        # 处理状态可能是字典或AgentState对象的情况
        if isinstance(state, dict):
            user_query = state.get('user_query', '')
            if not user_query:
                if 'errors' not in state:
                    state['errors'] = []
                state['errors'].append(f"{self.agent_name}: 缺少用户查询信息")
                return False
        else:
            if not state.user_query:
                state.add_error(f"{self.agent_name}: 缺少用户查询信息")
                return False
        
        return True
    
    def format_output(self, content: str, state: AgentState) -> str:
        """格式化输出内容"""
        from datetime import datetime
        
        # 处理状态可能是字典或AgentState对象的情况
        if isinstance(state, dict):
            user_query = state.get('user_query', '')
        else:
            user_query = state.user_query
        
        formatted_content = f"""
=== {self.agent_name} 分析报告 ===
时间: {datetime.now().strftime('%Y%m%d %H:%M:%S')}
用户问题: {user_query}
MCP工具: {'启用' if self.mcp_enabled else '禁用'}

{content}

=== 报告结束 ===
"""
        return formatted_content.strip()
