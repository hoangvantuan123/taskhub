package skillauth

import (
	"context"
	"encoding/json"
	"google.golang.org/grpc"
	"google.golang.org/protobuf/encoding/protojson"
	"google.golang.org/protobuf/types/known/structpb"
	pb "server-core/internal/directorypb"
)

type directoryRPC struct {
	pb.UnimplementedDirectoryServer
	server *Server
}

func RegisterDirectory(g *grpc.Server, s *Server) {
	pb.RegisterDirectoryServer(g, &directoryRPC{server: s})
}
func (d *directoryRPC) execute(ctx context.Context, op string, r *pb.Request) (*structpb.Struct, error) {
	raw, e := (protojson.MarshalOptions{UseProtoNames: true}).Marshal(r)
	if e != nil {
		return nil, invalid("Invalid request")
	}
	var payload map[string]any
	if e = json.Unmarshal(raw, &payload); e != nil {
		return nil, invalid("Invalid request")
	}
	delete(payload, "token")
	delete(payload, "ip")
	delete(payload, "user_agent")
	input, e := structpb.NewStruct(map[string]any{"action": "directory_" + op, "token": r.Token, "ip": r.Ip, "user_agent": r.UserAgent, "payload": payload})
	if e != nil {
		return nil, e
	}
	return d.server.Execute(ctx, input)
}
func (d *directoryRPC) A(c context.Context, r *pb.Request) (*structpb.Struct, error) {
	return d.execute(c, "a", r)
}
func (d *directoryRPC) U(c context.Context, r *pb.Request) (*structpb.Struct, error) {
	return d.execute(c, "u", r)
}
func (d *directoryRPC) D(c context.Context, r *pb.Request) (*structpb.Struct, error) {
	return d.execute(c, "d", r)
}
func (d *directoryRPC) Q(c context.Context, r *pb.Request) (*structpb.Struct, error) {
	return d.execute(c, "q", r)
}
